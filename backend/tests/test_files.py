"""Integration tests for file endpoints."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from models import UserSession


class TestImportFile:
    """Integration tests for POST /files/import endpoint."""

    def test_missing_auth_header_returns_422(self, client: TestClient) -> None:
        """Requests without X-Session-Token header should fail validation."""
        response = client.post("/files/import", json={"google_drive_id": "test-id"})
        assert response.status_code == 422

    def test_invalid_session_returns_401(self, client: TestClient) -> None:
        """Requests with invalid session token should be unauthorized."""
        response = client.post(
            "/files/import",
            json={"google_drive_id": "test-id"},
            headers={"X-Session-Token": "invalid-token"},
        )
        assert response.status_code == 401

    @patch("routers.files.get_drive_service")
    def test_unsupported_mime_type_returns_400(
        self,
        mock_drive: MagicMock,
        client: TestClient,
        valid_session: UserSession,
    ) -> None:
        """Google Forms and other unsupported types should be rejected."""
        mock_service = MagicMock()
        mock_service.files().get().execute.return_value = {
            "id": "test-id",
            "name": "test.form",
            "mimeType": "application/vnd.google-apps.form",
            "size": "1024",
        }
        mock_drive.return_value = mock_service

        response = client.post(
            "/files/import",
            json={"google_drive_id": "test-id"},
            headers={"X-Session-Token": valid_session.session_token},
        )
        assert response.status_code == 400
        assert "Cannot import" in response.json()["detail"]

    @patch("routers.files.get_drive_service")
    def test_large_file_returns_400(
        self,
        mock_drive: MagicMock,
        client: TestClient,
        valid_session: UserSession,
    ) -> None:
        """Files exceeding size limit should be rejected."""
        mock_service = MagicMock()
        mock_service.files().get().execute.return_value = {
            "id": "test-id",
            "name": "large.pdf",
            "mimeType": "application/pdf",
            "size": str(200 * 1024 * 1024),  # 200MB
        }
        mock_drive.return_value = mock_service

        response = client.post(
            "/files/import",
            json={"google_drive_id": "test-id"},
            headers={"X-Session-Token": valid_session.session_token},
        )
        assert response.status_code == 400
        assert "too large" in response.json()["detail"]


class TestGetFiles:
    """Integration tests for GET /files endpoint."""

    def test_empty_database_returns_empty_list(self, client: TestClient) -> None:
        """Empty data room should return empty list."""
        response = client.get("/files")
        assert response.status_code == 200
        assert response.json() == []


class TestDeleteFile:
    """Integration tests for DELETE /files/{file_id} endpoint."""

    def test_missing_auth_header_returns_422(self, client: TestClient) -> None:
        """Requests without X-Session-Token header should fail validation."""
        response = client.delete(f"/files/{uuid4()}")
        assert response.status_code == 422

    def test_nonexistent_file_returns_404(
        self,
        client: TestClient,
        valid_session: UserSession,
    ) -> None:
        """Deleting non-existent file should return 404."""
        response = client.delete(
            f"/files/{uuid4()}",
            headers={"X-Session-Token": valid_session.session_token},
        )
        assert response.status_code == 404
