"""Utility helpers for the document ingestion pipeline."""

import shutil
from pathlib import Path

from fastapi import UploadFile
from PyPDF2 import PdfReader

# location where incoming files are saved; configurable via environment
UPLOAD_DIR = Path("uploaded_docs")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_upload_file(upload_file: UploadFile, destination: Path) -> None:
    """Write a :class:`fastapi.UploadFile` to disk at ``destination``.

    The caller is responsible for choosing a directory with appropriate
    permissions and for cleaning up old files if space becomes a concern.
    """
    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)


def extract_text_from_pdf(path: str) -> str:
    """Extract all textual content from a PDF file located at ``path``.

    This helper uses :mod:`PyPDF2` which works well for most textual PDFs but
    might fail for scans/imagery (OCR would be required in that case).
    """
    reader = PdfReader(path)
    pages: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n".join(pages)