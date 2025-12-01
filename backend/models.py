from datetime import datetime
from uuid import UUID

from sqlmodel import SQLModel, Field


# Database tables
class DataRoomFileRead(SQLModel, table=True):
    id: UUID = Field(primary_key=True)
    name: str
    mime_type: str
    size: int
    file_path: str
    google_drive_id: str
    imported_at: datetime


class UserSession(SQLModel, table=True):
    session_token: str = Field(primary_key=True)
    access_token: str
    refresh_token: str | None = None
    token_expiry: datetime | None = None  # When access token expires
    scopes: str  # JSON-serialized list
    created_at: datetime = Field(default_factory=datetime.now)


# Input schemas
class DataRoomFileCreate(SQLModel):
    name: str
    mime_type: str
    size: int
    google_drive_id: str


class ImportFileRequest(SQLModel):
    google_drive_id: str
