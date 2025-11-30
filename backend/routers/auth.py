import secrets
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlmodel import Session

from config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI,
    FRONTEND_URL,
    SCOPES,
    SESSION_EXPIRY_DAYS,
)
from database import SessionDep
from models import UserSession

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory store for OAuth state (short-lived, used only during OAuth flow)
oauth_states: dict[str, bool] = {}


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


def get_drive_service(session_token: str, session: Session):
    """Build Google Drive service from stored credentials."""
    user_session = session.get(UserSession, session_token)
    if not user_session:
        raise HTTPException(status_code=401, detail="Invalid session token")

    if datetime.now() > user_session.expires_at:
        session.delete(user_session)
        session.commit()
        raise HTTPException(status_code=401, detail="Session expired")

    credentials = Credentials(
        token=user_session.access_token,
        refresh_token=user_session.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )
    return build("drive", "v3", credentials=credentials)


def validate_session(session_token: str | None, session: Session) -> str:
    """Validate session token and return it if valid."""
    if not session_token:
        raise HTTPException(
            status_code=401, detail="Unauthorized: Missing session token"
        )

    user_session = session.get(UserSession, session_token)
    if not user_session:
        raise HTTPException(
            status_code=401, detail="Unauthorized: Invalid session token"
        )

    if datetime.now() > user_session.expires_at:
        session.delete(user_session)
        session.commit()
        raise HTTPException(status_code=401, detail="Unauthorized: Session expired")

    return session_token


@router.get("/google")
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


@router.get("/google/callback")
def auth_google_callback(
    session: SessionDep,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
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

        # Store credentials in database
        user_session = UserSession(
            session_token=session_token,
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
            scopes=json.dumps(list(credentials.scopes) if credentials.scopes else []),
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(days=SESSION_EXPIRY_DAYS),
        )
        session.add(user_session)
        session.commit()

        # Redirect to frontend with session token only (not access_token for security)
        return RedirectResponse(
            url=f"{FRONTEND_URL}?auth_success=true&session_token={session_token}"
        )

    except Exception as e:
        print(f"OAuth error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}?auth_error=token_exchange_failed")


@router.get("/status")
def auth_status(session: SessionDep, session_token: str | None = None):
    """Check if user is authenticated."""
    if not session_token:
        return {"authenticated": False}

    user_session = session.get(UserSession, session_token)
    if not user_session:
        return {"authenticated": False}

    if datetime.now() > user_session.expires_at:
        session.delete(user_session)
        session.commit()
        return {"authenticated": False}

    return {
        "authenticated": True,
        "access_token": user_session.access_token,
    }


@router.post("/logout")
def auth_logout(session: SessionDep, session_token: str | None = None):
    """Clear user session."""
    if session_token:
        user_session = session.get(UserSession, session_token)
        if user_session:
            session.delete(user_session)
            session.commit()
    return {"success": True}
