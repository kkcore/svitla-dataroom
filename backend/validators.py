"""Validation functions for file import operations."""

from config import MAX_FILE_SIZE, UNSUPPORTED_MIME_TYPES

# Google Docs export format mapping
GOOGLE_DOCS_EXPORT_FORMATS: dict[str, tuple[str, str]] = {
    "application/vnd.google-apps.document": ("application/pdf", ".pdf"),
    "application/vnd.google-apps.spreadsheet": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xlsx",
    ),
    "application/vnd.google-apps.presentation": ("application/pdf", ".pdf"),
}


def validate_mime_type(mime_type: str) -> tuple[bool, str | None]:
    """Check if MIME type is supported.

    Args:
        mime_type: The MIME type string to validate.

    Returns:
        Tuple of (is_valid, error_message). error_message is None if valid.
    """
    if mime_type in UNSUPPORTED_MIME_TYPES:
        file_type = mime_type.split(".")[-1]
        return False, f"Cannot import this file type ({file_type})"
    return True, None


def validate_file_size(size: int, max_size: int = MAX_FILE_SIZE) -> tuple[bool, str | None]:
    """Check if file size is within limit.

    Args:
        size: File size in bytes.
        max_size: Maximum allowed size in bytes.

    Returns:
        Tuple of (is_valid, error_message). error_message is None if valid.
    """
    if size > max_size:
        return False, f"File too large. Maximum size is {max_size // (1024 * 1024)}MB"
    return True, None


def get_export_format(mime_type: str) -> tuple[str, str] | None:
    """Get export MIME type and extension for Google Docs types.

    Args:
        mime_type: The Google Docs MIME type.

    Returns:
        Tuple of (export_mime_type, file_extension) or None if not a Google Doc.
    """
    return GOOGLE_DOCS_EXPORT_FORMATS.get(mime_type)
