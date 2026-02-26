"""FastAPI router exposing document upload and query endpoints."""

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from database import get_db
from authentication.routes import get_current_user
from authentication.models import User

from .schemas import DocumentUploadResponse, QueryRequest, QueryResponse
from .services import DocService


router = APIRouter(prefix="/doc", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    subject: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentUploadResponse:
    try:
        doc = DocService.upload_document(
            user_id=current_user.id, subject=subject, file=file, db=db
        )
        return DocumentUploadResponse(
            document_name=doc.document_name,
            subject=doc.subject,
            total_chunks=doc.total_chunks,
        )
    except ValueError as exc:
        msg = str(exc)
        # connectivity issues to Qdrant should be treated as server errors
        if "Qdrant" in msg or "unreachable" in msg:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/query", response_model=QueryResponse, status_code=status.HTTP_200_OK)
async def query_documents(
    request: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QueryResponse:
    try:
        return DocService.query_documents(
            user_id=current_user.id,
            subject=request.subject,
            question=request.question,
            top_k=request.top_k,
            db=db,
        )
    except ValueError as exc:
        msg = str(exc)
        # translate backend issues into appropriate HTTP codes
        if "Qdrant" in msg or "unreachable" in msg or "LLM" in msg:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
