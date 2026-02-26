"""Pydantic models for document upload/query APIs."""

from pydantic import BaseModel
from typing import List, Optional


class DocumentUploadResponse(BaseModel):
    document_name: str
    subject: str
    total_chunks: int


class QueryRequest(BaseModel):
    subject: str
    question: str
    top_k: Optional[int] = 5


class Source(BaseModel):
    document_name: str
    chunk_index: int
    chunk_text: str


class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]
