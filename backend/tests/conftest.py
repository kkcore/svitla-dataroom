"""Shared pytest fixtures for backend tests."""

from collections.abc import Generator
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from database import get_db_session
from main import app
from models import UserSession


@pytest.fixture
def db_engine() -> Generator[Engine, None, None]:
    """Create an in-memory SQLite engine for testing."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(db_engine: Engine) -> Generator[Session, None, None]:
    """Provide a database session for testing."""
    with Session(db_engine) as session:
        yield session


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """TestClient with overridden database dependency."""

    def get_session_override() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db_session] = get_session_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def valid_session(db_session: Session) -> UserSession:
    """Create a valid user session for authenticated requests."""
    session = UserSession(
        session_token="test-session-token",
        access_token="test-access-token",
        refresh_token="test-refresh-token",
        token_expiry=datetime.now() + timedelta(hours=1),
        scopes='["https://www.googleapis.com/auth/drive.readonly"]',
        created_at=datetime.now(),
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


@pytest.fixture
def expired_session(db_session: Session) -> UserSession:
    """Create a session with an expired token for refresh testing."""
    session = UserSession(
        session_token="expired-session-token",
        access_token="old-access-token",
        refresh_token="valid-refresh-token",
        token_expiry=datetime.now() - timedelta(hours=1),
        scopes="[]",
        created_at=datetime.now(),
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session
