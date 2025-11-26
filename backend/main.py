import os
import secrets
from typing import Union

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow

load_dotenv()

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:5001/auth/google/callback"
FRONTEND_URL = "http://localhost:5173"

# Scopes for Google Drive access
SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
]

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

        # Redirect to frontend with session token
        return RedirectResponse(
            url=f"{FRONTEND_URL}?auth_success=true&session_token={session_token}&access_token={credentials.token}"
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
