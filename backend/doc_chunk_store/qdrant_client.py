"""
Thin, production-grade wrapper around the Qdrant Python client.

Responsibilities:
- Load configuration from environment
- Manage a single Qdrant client instance
- Create collection once (not per request)
- Provide simple upsert and search APIs
- Isolate vector DB concerns from business logic

This file is SAFE for:
- Qdrant Cloud
- Multiple users
- Concurrent requests
"""

import os
import uuid
from typing import List, Optional

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Filter,
    FieldCondition,
    MatchValue,
    PointStruct,
)
from httpx import ConnectError

# Load environment variables early (CRITICAL)
load_dotenv()


class QdrantClientWrapper:
    def __init__(self):
        # ---- Configuration ----
        self.url = os.getenv("QDRANT_URL")
        self.api_key = os.getenv("QDRANT_API_KEY")

        if not self.url:
            raise RuntimeError(
                "QDRANT_URL is not set. "
                "For Qdrant Cloud, this must be an https URL."
            )

        self.collection_name = os.getenv("QDRANT_COLLECTION", "documents")
        self.distance = os.getenv("QDRANT_DISTANCE", "Cosine")

        # ---- Client ----
        self.client = QdrantClient(
            url=self.url,
            api_key=self.api_key,
            timeout=30,
        )

        self._collection_initialized = False

    # ------------------------------------------------------------------
    # Collection lifecycle
    # ------------------------------------------------------------------
    def ensure_collection(self, vector_size: int) -> None:
        """
        Ensure the collection exists.
        This should be called ONCE at app startup.
        """
        if self._collection_initialized:
            return

        try:
            collections = self.client.get_collections().collections
            existing_names = {c.name for c in collections}
        except Exception as e:
            raise RuntimeError(
                f"Unable to connect to Qdrant at {self.url}: {e}"
            )

        if self.collection_name not in existing_names:
            try:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config={
                        "size": vector_size,
                        "distance": self.distance,
                    },
                )
            except Exception as e:
                raise RuntimeError(
                    f"Failed to create Qdrant collection '{self.collection_name}': {e}"
                )

        self._collection_initialized = True

    # ------------------------------------------------------------------
    # Upsert vectors
    # ------------------------------------------------------------------
    def upsert(
        self,
        vectors: List[List[float]],
        payloads: List[dict],
        ids: Optional[List[str]] = None,
    ) -> None:
        if not vectors:
            return

        if not self._collection_initialized:
            raise RuntimeError(
                "Qdrant collection not initialized. "
                "Call ensure_collection() at application startup."
            )

        points: List[PointStruct] = []

        for idx, (vector, payload) in enumerate(zip(vectors, payloads)):
            # Use provided id if available; otherwise generate a UUID string.
            point_id = ids[idx] if ids and idx < len(ids) else None
            if point_id is None:
                point_id = str(uuid.uuid4())
            points.append(
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=payload,
                )
            )

        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points,
            )
        except ConnectError as e:
            raise RuntimeError(
                f"Failed to upsert vectors to Qdrant (connection error): {e}"
            )
        except Exception as e:
            raise RuntimeError(
                f"Failed to upsert vectors to Qdrant: {e}"
            )

    # ------------------------------------------------------------------
    # Search vectors
    # ------------------------------------------------------------------
    def search(
        self,
        embedding: List[float],
        user_id: int,
        subject: str,
        top_k: int = 5,
    ):
        query_filter = Filter(
            must=[
                FieldCondition(
                    key="user_id",
                    match=MatchValue(value=user_id),
                ),
                FieldCondition(
                    key="subject",
                    match=MatchValue(value=subject),
                ),
            ]
        )

        try:
            return self.client.search(
                collection_name=self.collection_name,
                query_vector=embedding,
                query_filter=query_filter,
                limit=top_k,
            )
        except ConnectError as e:
            raise RuntimeError(
                f"Search failed: Qdrant is unreachable ({e})"
            )
        except Exception as e:
            raise RuntimeError(
                f"Search failed in Qdrant: {e}"
            )


# ----------------------------------------------------------------------
# Singleton instance (safe to import across app)
# ----------------------------------------------------------------------
qdrant_client = QdrantClientWrapper()