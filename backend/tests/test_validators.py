"""Unit tests for validation functions."""

from routers.files import sanitize_filename
from validators import get_export_format, validate_file_size, validate_mime_type


class TestValidateMimeType:
    """Tests for MIME type validation."""

    def test_valid_pdf_returns_true(self) -> None:
        """PDF files should be accepted."""
        is_valid, error = validate_mime_type("application/pdf")
        assert is_valid is True
        assert error is None

    def test_valid_image_returns_true(self) -> None:
        """Image files should be accepted."""
        is_valid, error = validate_mime_type("image/png")
        assert is_valid is True
        assert error is None

    def test_unsupported_google_form_returns_false(self) -> None:
        """Google Forms cannot be downloaded and should be rejected."""
        is_valid, error = validate_mime_type("application/vnd.google-apps.form")
        assert is_valid is False
        assert error is not None
        assert "Cannot import" in error

    def test_unsupported_google_folder_returns_false(self) -> None:
        """Google Drive folders should be rejected."""
        is_valid, error = validate_mime_type("application/vnd.google-apps.folder")
        assert is_valid is False
        assert error is not None


class TestValidateFileSize:
    """Tests for file size validation."""

    def test_small_file_returns_true(self) -> None:
        """Files under the limit should be accepted."""
        is_valid, error = validate_file_size(1024)  # 1KB
        assert is_valid is True
        assert error is None

    def test_exact_limit_returns_true(self) -> None:
        """Files exactly at the limit should be accepted."""
        max_size = 100 * 1024 * 1024  # 100MB
        is_valid, error = validate_file_size(max_size, max_size=max_size)
        assert is_valid is True
        assert error is None

    def test_exceeds_limit_returns_false(self) -> None:
        """Files over the limit should be rejected."""
        is_valid, error = validate_file_size(200 * 1024 * 1024)  # 200MB
        assert is_valid is False
        assert error is not None
        assert "too large" in error

    def test_custom_max_size(self) -> None:
        """Custom max size should be respected."""
        is_valid, error = validate_file_size(2000, max_size=1000)
        assert is_valid is False
        assert error is not None


class TestGetExportFormat:
    """Tests for Google Docs export format mapping."""

    def test_google_doc_exports_to_pdf(self) -> None:
        """Google Docs should export to PDF."""
        result = get_export_format("application/vnd.google-apps.document")
        assert result is not None
        mime_type, extension = result
        assert mime_type == "application/pdf"
        assert extension == ".pdf"

    def test_google_sheet_exports_to_xlsx(self) -> None:
        """Google Sheets should export to XLSX."""
        result = get_export_format("application/vnd.google-apps.spreadsheet")
        assert result is not None
        mime_type, extension = result
        assert "spreadsheet" in mime_type
        assert extension == ".xlsx"

    def test_google_presentation_exports_to_pdf(self) -> None:
        """Google Slides should export to PDF."""
        result = get_export_format("application/vnd.google-apps.presentation")
        assert result is not None
        mime_type, extension = result
        assert mime_type == "application/pdf"
        assert extension == ".pdf"

    def test_regular_file_returns_none(self) -> None:
        """Non-Google-Docs files should return None."""
        result = get_export_format("application/pdf")
        assert result is None

    def test_unknown_mime_type_returns_none(self) -> None:
        """Unknown MIME types should return None."""
        result = get_export_format("application/x-unknown")
        assert result is None


class TestSanitizeFilename:
    """Tests for filename sanitization."""

    def test_removes_path_traversal_attack(self) -> None:
        """Path traversal attempts should be stripped."""
        result = sanitize_filename("../../../etc/passwd")
        assert result == "passwd"
        assert ".." not in result

    def test_removes_leading_path_components(self) -> None:
        """Leading directory paths should be removed."""
        result = sanitize_filename("/home/user/documents/file.pdf")
        assert result == "file.pdf"

    def test_removes_dangerous_characters(self) -> None:
        """Script injection characters should be replaced."""
        result = sanitize_filename("file<script>.txt")
        assert "<" not in result
        assert ">" not in result

    def test_preserves_safe_characters(self) -> None:
        """Safe characters should be preserved."""
        result = sanitize_filename("my-file_name.pdf")
        assert result == "my-file_name.pdf"

    def test_truncates_long_names_preserving_extension(self) -> None:
        """Long filenames should be truncated while keeping extension."""
        long_name = "a" * 300 + ".pdf"
        result = sanitize_filename(long_name)
        assert len(result) <= 200
        assert result.endswith(".pdf")

    def test_handles_empty_string(self) -> None:
        """Empty strings should return empty."""
        result = sanitize_filename("")
        assert result == ""
