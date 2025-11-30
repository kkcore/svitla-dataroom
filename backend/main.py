import os
import secrets
import re
from typing import Annotated

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, FileResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from uuid import UUID, uuid4
from datetime import datetime
from sqlmodel import SQLModel, create_engine, Session, Field, select
from contextlib import asynccontextmanager
from pathlib import Path
import io

load_dotenv()

# OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:5001/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# Don't try to download unsupported mime-types
# You would get 403 when trying to download
# non-binary-content
UNSUPPORTED_MIME_TYPES = (
    "application/vnd.google-apps.map",         # Google My Maps
    "application/vnd.google-apps.form",        # Google Forms
    "application/vnd.google-apps.site",        # Google Sites
    "application/vnd.google-apps.folder",      # Google Drive Folders
    "application/vnd.google-apps.shortcut",    # Drive Shortcuts (pointers to other files)
    "application/vnd.google-apps.drive-sdk",   # 3rd-party Shortcuts (links to external apps like Lucidchart)
    "application/vnd.google-apps.fusiontable", # Google Fusion Tables (Legacy/Deprecated)
    "application/vnd.google-apps.jam",         # Google Jamboard (Discontinued)
    "application/vnd.google-apps.unknown"      # Unknown file types
)

UPLOAD_DIR = Path("./uploads")
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB limit

# -- db
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///database.db")
connect_args = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


# -- models
class DataRoomFileRead(SQLModel, table=True):
    id: UUID = Field(primary_key=True)
    name: str
    mime_type: str
    size: int
    file_path: str
    google_drive_id: str
    imported_at: datetime


# -- Input schemas
class DataRoomFileCreate(SQLModel):
    name: str
    mime_type: str
    size: int
    google_drive_id: str


class ImportFileRequest(SQLModel):
    google_drive_id: str


# Lifespan context manager (must be defined before app creation)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: runs before the app starts accepting requests
    create_db_and_tables()
    UPLOAD_DIR.mkdir(exist_ok=True)
    yield


# Create FastAPI app with lifespan
app = FastAPI(lifespan=lifespan)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Scopes for Google Drive access
SCOPES = (
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
)

# In-memory store for OAuth state and tokens (use Redis/DB in production)
oauth_states: dict[str, bool] = {}
tokens: dict[str, dict] = {}  # Simple in-memory token store


def get_oauth_flow(state: str | None = None) -> Flow:
    """Create OAuth flow from environment variables."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars.",
        )

    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }

    flow = Flow.from_client_config(client_config, scopes=SCOPES, state=state)
    flow.redirect_uri = REDIRECT_URI
    return flow


def get_drive_service(session_token: str):
    """Build Google Drive service from stored credentials."""
    if session_token not in tokens:
        raise HTTPException(status_code=401, detail="Invalid session token")

    token_data = tokens[session_token]
    credentials = Credentials(
        token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=token_data.get("client_id", GOOGLE_CLIENT_ID),
        client_secret=token_data.get("client_secret", GOOGLE_CLIENT_SECRET),
    )
    return build("drive", "v3", credentials=credentials)


def validate_session(session_token: str | None) -> str:
    """Validate session token and return it if valid."""
    if not session_token or session_token not in tokens:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing session token")
    return session_token


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal attacks."""
    # Remove any path separators and dangerous characters
    filename = os.path.basename(filename)
    # Replace any remaining problematic characters
    filename = re.sub(r'[^\w\s\-\.]', '_', filename)
    # Limit length
    if len(filename) > 200:
        name, ext = os.path.splitext(filename)
        filename = name[:200-len(ext)] + ext
    return filename


# -- Auth Endpoints
@app.get("/auth/google")
def auth_google():
    """Initiate Google OAuth flow - redirects user to Google consent screen."""
    flow = get_oauth_flow()

    authorization_url, state = flow.authorization_url(
        access_type="offline",  # Get refresh token
        include_granted_scopes="true",
        prompt="consent",
    )

    # Store state for verification in callback
    oauth_states[state] = True

    return RedirectResponse(url=authorization_url)


@app.get("/auth/google/callback")
def auth_google_callback(code: str | None = None, state: str | None = None, error: str | None = None):
    """Handle Google OAuth callback."""
    if error:
        return RedirectResponse(url=f"{FRONTEND_URL}?auth_error={error}")

    if not code or not state:
        return RedirectResponse(url=f"{FRONTEND_URL}?auth_error=missing_params")

    # Verify state to prevent CSRF
    if state not in oauth_states:
        return RedirectResponse(url=f"{FRONTEND_URL}?auth_error=invalid_state")

    # Clean up used state
    del oauth_states[state]

    try:
        flow = get_oauth_flow(state=state)
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Generate a session token for the frontend
        session_token = secrets.token_urlsafe(32)

        # Store credentials (in production, use secure storage)
        tokens[session_token] = {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": list(credentials.scopes) if credentials.scopes else [],
        }

        # Redirect to frontend with session token only (not access_token for security)
        return RedirectResponse(
            url=f"{FRONTEND_URL}?auth_success=true&session_token={session_token}"
        )

    except Exception as e:
        print(f"OAuth error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}?auth_error=token_exchange_failed")


@app.get("/auth/status")
def auth_status(session_token: str | None = None):
    """Check if user is authenticated."""
    if not session_token or session_token not in tokens:
        return {"authenticated": False}

    return {
        "authenticated": True,
        "access_token": tokens[session_token]["access_token"],
    }


@app.post("/auth/logout")
def auth_logout(session_token: str | None = None):
    """Clear user session."""
    if session_token and session_token in tokens:
        del tokens[session_token]
    return {"success": True}


# -- File Endpoints
@app.post("/files/import", response_model=DataRoomFileRead)
def import_file(
    request: ImportFileRequest,
    session: SessionDep,
    x_session_token: str = Header(..., alias="X-Session-Token"),
):
    # todo: check for other emails as I had 403 error 
    """Import a file from Google Drive to the data room."""
    validate_session(x_session_token)

    try:
        # Build Drive service
        drive_service = get_drive_service(x_session_token)

        # Get file metadata from Google Drive
        file_metadata = drive_service.files().get(
            fileId=request.google_drive_id,
            fields="id,name,mimeType,size"
        ).execute()

        file_name = file_metadata.get("name", "unknown")
        mime_type = file_metadata.get("mimeType", "application/octet-stream")
        file_size = int(file_metadata.get("size", 0))
        if mime_type in UNSUPPORTED_MIME_TYPES:
            file_type = mime_type.split(".")[-1]
            raise HTTPException(
                status_code=400,
                detail=f"Cannot import this file type ({file_type}). Only files with binary content can be download"
            )

        # Check file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )

        # Check if it's a Google Docs type (needs export)
        google_docs_types = {
            "application/vnd.google-apps.document": ("application/pdf", ".pdf"),
            "application/vnd.google-apps.spreadsheet": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
            "application/vnd.google-apps.presentation": ("application/pdf", ".pdf"),
        }

        # Generate unique file ID and path
        file_id = uuid4()
        safe_name = sanitize_filename(file_name)

        if mime_type in google_docs_types:
            # https://developers.google.com/resources/api-libraries/documentation/drive/v3/python/latest/drive_v3.files.html
            # Export Google Docs files
            # Export media works only up to 10 MB
            export_mime, ext = google_docs_types[mime_type]
            file_path = UPLOAD_DIR / f"{file_id}_{safe_name}{ext}"
            mime_type = export_mime

            request_media = drive_service.files().export_media(
                fileId=request.google_drive_id,
                mimeType=export_mime
            )
        else:
            # Download regular files
            file_path = UPLOAD_DIR / f"{file_id}_{safe_name}"
            request_media = drive_service.files().get_media(fileId=request.google_drive_id)

        # Download file content
        file_content = io.BytesIO()
        downloader = MediaIoBaseDownload(file_content, request_media)

        done = False
        while not done:
            _, done = downloader.next_chunk()

        # Save to disk
        file_content.seek(0)
        with open(file_path, "wb") as f:
            f.write(file_content.read())

        # Get actual file size after download
        actual_size = file_path.stat().st_size

        # Create database record
        db_file = DataRoomFileRead(
            id=file_id,
            name=file_name,
            mime_type=mime_type,
            size=actual_size,
            file_path=str(file_path),
            google_drive_id=request.google_drive_id,
            imported_at=datetime.now(),
        )
        session.add(db_file)
        session.commit()
        session.refresh(db_file)

        return db_file

    except HTTPException:
        raise
    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=500, detail=f"Failed to import file: {str(e)}")


@app.get("/files", response_model=list[DataRoomFileRead])
def get_files(session: SessionDep):
    """Get all files in the data room."""
    files = session.exec(select(DataRoomFileRead)).all()
    return files


@app.get("/files/{file_id}/download")
def download_file(file_id: UUID, session: SessionDep):
    """Download a file from the data room."""
    db_file = session.get(DataRoomFileRead, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = Path(db_file.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=file_path,
        filename=db_file.name,
        media_type=db_file.mime_type,
        content_disposition_type="inline"
    )


@app.delete("/files/{file_id}")
def delete_file(
    file_id: UUID,
    session: SessionDep,
    x_session_token: str = Header(..., alias="X-Session-Token"),
):
    """Delete a file from the data room."""
    validate_session(x_session_token)

    db_file = session.get(DataRoomFileRead, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Delete physical file
    file_path = Path(db_file.file_path)
    if file_path.exists():
        file_path.unlink()

    # Delete database record
    session.delete(db_file)
    session.commit()

    return {"success": True, "message": f"File '{db_file.name}' deleted"}
