import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:5001/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///database.db")

# File storage
UPLOAD_DIR = Path("./uploads")
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB limit

# Session
SESSION_EXPIRY_DAYS = 7

# Google Drive scopes
SCOPES = (
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
)

# Don't try to download unsupported mime-types
# You would get 403 when trying to download non-binary-content
UNSUPPORTED_MIME_TYPES = (
    "application/vnd.google-apps.map",  # Google My Maps
    "application/vnd.google-apps.form",  # Google Forms
    "application/vnd.google-apps.site",  # Google Sites
    "application/vnd.google-apps.folder",  # Google Drive Folders
    "application/vnd.google-apps.shortcut",  # Drive Shortcuts (pointers to other files)
    "application/vnd.google-apps.drive-sdk",  # 3rd-party Shortcuts (links to external apps like Lucidchart)
    "application/vnd.google-apps.fusiontable",  # Google Fusion Tables (Legacy/Deprecated)
    "application/vnd.google-apps.jam",  # Google Jamboard (Discontinued)
    "application/vnd.google-apps.unknown",  # Unknown file types
)
