"""Business logic for document ingestion and retrieval.

This module coordinates between the relational database, the PDF
utilities, the chunker/embedding logic and the vector store.  The router
simply delegates the heavy lifting to these methods.

All methods raise ``ValueError`` on user-level problems (invalid subject,
duplicate upload, etc.).  The router converts those into appropriate
HTTP responses.
"""

import os
import uuid
from pathlib import Path
from typing import List

from fastapi import UploadFile
from sqlalchemy.orm import Session

from profile.models import Profile
from .models import Document
from . import chunker, embeddings
from .utils import save_upload_file, extract_text_from_pdf, UPLOAD_DIR
from .qdrant_client import qdrant_client
from .schemas import Source, QueryResponse
from .llm import LLMService


class DocService:
    @staticmethod
    def _validate_subject(user_id: int, subject: str, db: Session) -> None:
        """Ensure the supplied subject is one of the three subjects owned by
        the user.
        """
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            raise ValueError("User profile not found")
        if subject not in (profile.subject1, profile.subject2, profile.subject3):
            raise ValueError(f"Subject '{subject}' is not associated with the user")

    @staticmethod
    def upload_document(
        user_id: int, subject: str, file: UploadFile, db: Session
    ) -> Document:
        """Persist a PDF, chunk/embeddings it, and record everything in the
        relational database and vector store.

        The steps are intentionally synchronous and straightforward; they can
        be moved to background workers or broken into smaller jobs once the
        volume of documents grows.
        """

        # validate
        DocService._validate_subject(user_id, subject, db)

        # save file to disk using a unique name so we don't collide
        suffix = Path(file.filename).suffix or ".pdf"
        unique_name = f"{uuid.uuid4().hex}{suffix}"
        destination: Path = UPLOAD_DIR / unique_name
        save_upload_file(file, destination)

        # create metadata record with zero chunks initially
        doc = Document(
            user_id=user_id,
            subject=subject,
            document_name=file.filename,
            file_name=str(unique_name),
            total_chunks=0,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # extract text and chop into chunks
        full_text = extract_text_from_pdf(str(destination))
        chunk_size = int(os.getenv("CHUNK_SIZE", "1000"))
        overlap = int(os.getenv("CHUNK_OVERLAP", "200"))
        chunks = chunker.chunk_text(full_text, chunk_size, overlap)

        # generate embeddings using the configured provider (OpenAI by default)
        # every vector should be `EMBEDDING_DIM` long (1536)
        vectors = embeddings.embed_texts(chunks)

        # prepare payloads for Qdrant
        payloads: List[dict] = []
        for idx, chunk_text in enumerate(chunks):
            payloads.append(
                {
                    "user_id": user_id,
                    "subject": subject,
                    "document_id": doc.id,
                    "document_name": file.filename,
                    "chunk_index": idx,
                    "chunk_text": chunk_text,
                }
            )

        # store vectors in Qdrant
        qdrant_client.upsert(vectors=vectors, payloads=payloads)

        # update document row with chunk count
        doc.total_chunks = len(chunks)
        db.add(doc)
        db.commit()
        db.refresh(doc)

        return doc

    @staticmethod
    def query_documents(
        user_id: int, subject: str, question: str, top_k: int, db: Session
    ) -> QueryResponse:
        """Retrieve relevant chunks for ``question`` and return an answer.

        The returned structure aligns with the ``QueryResponse`` schema so the
        router can simply return the object directly.
        """

        # verify the subject
        DocService._validate_subject(user_id, subject, db)

        # SECURITY: require a concrete user_id for all searches. This
        # guarantees server-side, Qdrant-enforced isolation so a user can
        # never retrieve chunks uploaded by another user. Do not remove
        # or bypass this check — it is a core security property of the
        # system and must live in the service layer (not the router).
        if not user_id:
            raise ValueError("user_id is required for queries to enforce per-user isolation")

        # get vector for the question
        question_vec = embeddings.embed_text(question)
        top_k = top_k or int(os.getenv("TOP_K", "5"))

        # perform the vector search with strict filters; the Qdrant client
        # ensures that only chunks belonging to the specific user and subject
        # are considered.  There is no additional client-side filtering.
        results = qdrant_client.search(
            embedding=question_vec, user_id=user_id, subject=subject, top_k=top_k
        )

        # no matches means we can't sensibly call an LLM; return a clear
        # message and an empty sources list.  This satisfies the requirement
        # to handle empty search results gracefully.
        if not results:
            return QueryResponse(
                answer="No relevant information found for your question.",
                sources=[],
            )

        sources: List[Source] = []
        contexts: List[str] = []

        # build the context string which will be fed to the LLM.  each chunk
        # is prefixed with its document name and index so the model (and any
        # downstream logs) can trace the origin of the text.
        for point in results:
            payload = point.payload
            sources.append(
                Source(
                    document_name=payload.get("document_name"),
                    chunk_index=payload.get("chunk_index"),
                    chunk_text=payload.get("chunk_text"),
                )
            )
            contexts.append(
                f"Document: {payload.get('document_name')}\n"
                f"Chunk {payload.get('chunk_index')}:\n"
                f"{payload.get('chunk_text')}"
            )

        context_text = "\n\n".join(contexts)

        # call out to the LLM service to generate a final answer.  the
        # service itself is responsible for ensuring the model only sees the
        # supplied context and for obeying our "no hallucination" instruction.
        try:
            answer = LLMService.answer_question(question, context_text)
        except Exception as e:  # pragma: no cover - provider/network failures
            # wrap any lower‑level error so the router can decide how to
            # translate it to an HTTP response.  LLM problems are considered
            # server‑side issues rather than bad user input.
            raise ValueError(f"LLM error: {e}")

        return QueryResponse(answer=answer, sources=sources)

