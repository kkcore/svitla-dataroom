import os
import re
import io
from datetime import datetime
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import FileResponse
from googleapiclient.http import MediaIoBaseDownload
from sqlmodel import select

from config import UPLOAD_DIR, MAX_FILE_SIZE, UNSUPPORTED_MIME_TYPES
from database import SessionDep
from models import DataRoomFileRead, ImportFileRequest
from routers.auth import get_drive_service, validate_session

router = APIRouter(prefix="/files", tags=["files"])

MAX_FILENAME_LENGTH = 200  # Safe margin below filesystem limits (ext4/NTFS: 255)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal attacks.

    - Strips directory components (../../../etc/passwd → passwd)
    - Removes dangerous characters, keeping only [a-zA-Z0-9_\s\-\.]
    - Truncates to MAX_FILENAME_LENGTH while preserving extension
    """
    filename = os.path.basename(filename)
    filename = re.sub(r"[^\w\s\-\.]", "_", filename)

    if len(filename) > MAX_FILENAME_LENGTH:
        name, ext = os.path.splitext(filename)
        filename = name[: MAX_FILENAME_LENGTH - len(ext)] + ext

    return filename


@router.post("/import", response_model=DataRoomFileRead)
def import_file(
    request: ImportFileRequest,
    session: SessionDep,
    x_session_token: str = Header(..., alias="X-Session-Token"),
):
    """Import a file from Google Drive to the data room."""
    validate_session(x_session_token, session)

    try:
        # Build Drive service
        drive_service = get_drive_service(x_session_token, session)

        # Get file metadata from Google Drive
        file_metadata = (
            drive_service.files()
            .get(fileId=request.google_drive_id, fields="id,name,mimeType,size")
            .execute()
        )

        file_name = file_metadata.get("name", "unknown")
        mime_type = file_metadata.get("mimeType", "application/octet-stream")
        file_size = int(file_metadata.get("size", 0))
        if mime_type in UNSUPPORTED_MIME_TYPES:
            file_type = mime_type.split(".")[-1]
            raise HTTPException(
                status_code=400,
                detail=f"Cannot import this file type ({file_type}). Only files with binary content can be download",
            )

        # Check file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB",
            )

        # Check if it's a Google Docs type (needs export)
        google_docs_types = {
            "application/vnd.google-apps.document": ("application/pdf", ".pdf"),
            "application/vnd.google-apps.spreadsheet": (
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".xlsx",
            ),
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
                fileId=request.google_drive_id, mimeType=export_mime
            )
        else:
            # Download regular files
            file_path = UPLOAD_DIR / f"{file_id}_{safe_name}"
            request_media = drive_service.files().get_media(
                fileId=request.google_drive_id
            )

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
        raise HTTPException(status_code=500, detail=f"Failed to import file: {str(e)}")


@router.get("", response_model=list[DataRoomFileRead])
def get_files(session: SessionDep):
    """Get all files in the data room."""
    files = session.exec(select(DataRoomFileRead)).all()
    return files


@router.get("/{file_id}/download")
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
        content_disposition_type="inline",
    )


@router.delete("/{file_id}")
def delete_file(
    file_id: UUID,
    session: SessionDep,
    x_session_token: str = Header(..., alias="X-Session-Token"),
):
    """Delete a file from the data room."""
    validate_session(x_session_token, session)

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
