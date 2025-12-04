"""Integration tests for authentication endpoints."""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from models import UserSession


class TestAuthStatus:
    """Integration tests for GET /auth/status endpoint."""

    def test_no_session_token_returns_unauthenticated(
        self,
        client: TestClient,
    ) -> None:
        """Missing session token should return authenticated=False."""
        response = client.get("/auth/status")
        assert response.status_code == 200
        assert response.json() == {"authenticated": False}

    def test_invalid_session_token_returns_unauthenticated(
        self,
        client: TestClient,
    ) -> None:
        """Invalid session token should return authenticated=False."""
        response = client.get("/auth/status", params={"session_token": "invalid"})
        assert response.status_code == 200
        assert response.json() == {"authenticated": False}

    def test_valid_session_returns_authenticated_with_token(
        self,
        client: TestClient,
        valid_session: UserSession,
    ) -> None:
        """Valid session should return authenticated=True and access_token."""
        response = client.get(
            "/auth/status",
            params={"session_token": valid_session.session_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert "access_token" in data
        assert data["access_token"] == valid_session.access_token

    @patch("routers.auth.google.auth.transport.requests.Request")
    @patch("routers.auth.Credentials")
    def test_expired_token_triggers_refresh(
        self,
        mock_credentials_class: MagicMock,
        mock_request_class: MagicMock,
        client: TestClient,
        expired_session: UserSession,
    ) -> None:
        """Expired tokens should be automatically refreshed."""
        # Setup mock credentials
        mock_credentials = MagicMock()
        mock_credentials.token = "new-access-token"
        mock_credentials.expiry = datetime.now() + timedelta(hours=1)
        mock_credentials_class.return_value = mock_credentials

        response = client.get(
            "/auth/status",
            params={"session_token": expired_session.session_token},
        )

        assert response.status_code == 200
        # Verify refresh was called
        mock_credentials.refresh.assert_called_once()


class TestLogout:
    """Integration tests for POST /auth/logout endpoint."""

    def test_logout_returns_success(
        self,
        client: TestClient,
        valid_session: UserSession,
    ) -> None:
        """Logout should return success=True."""
        response = client.post(
            "/auth/logout",
            params={"session_token": valid_session.session_token},
        )
        assert response.status_code == 200
        assert response.json() == {"success": True}

    def test_logout_deletes_session_from_database(
        self,
        client: TestClient,
        valid_session: UserSession,
        db_session: Session,
    ) -> None:
        """Logout should remove session from database."""
        client.post(
            "/auth/logout",
            params={"session_token": valid_session.session_token},
        )

        # Verify session is deleted
        deleted_session = db_session.get(UserSession, valid_session.session_token)
        assert deleted_session is None

    def test_logout_without_session_token_returns_success(
        self,
        client: TestClient,
    ) -> None:
        """Logout without session token should still succeed."""
        response = client.post("/auth/logout")
        assert response.status_code == 200
        assert response.json() == {"success": True}
