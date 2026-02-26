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
import logging

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

logger = logging.getLogger(__name__)


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
            timeout=90,
        )

        self._collection_initialized = False

    # ------------------------------------------------------------------
    # Collection lifecycle
    # ------------------------------------------------------------------
    def ensure_collection(self, vector_size: int) -> None:
        """Ensure the collection exists and is configured with the
        correct vector dimensionality.

        This method is safe to call multiple times; it will return early
        once initialization has completed. Connection failures are
        translated into RuntimeError so callers can decide how to react
        (retry, abort startup, etc.).
        
        IMPORTANT: This method does NOT delete existing collections. It only
        creates the collection if it doesn't exist, and adds indices as needed.
        Your uploaded documents are preserved across application restarts.
        """
        if self._collection_initialized:
            return

        if vector_size <= 0:
            raise ValueError("vector_size must be a positive integer")

        try:
            collections = self.client.get_collections().collections
            existing_names = {c.name for c in collections}
        except ConnectError as e:
            raise RuntimeError(f"Unable to connect to Qdrant at {self.url}: {e}")
        except Exception as e:
            raise RuntimeError(f"Failed to retrieve collections from Qdrant: {e}")

        # only create if it doesn't exist; preserves existing data
        if self.collection_name not in existing_names:
            try:
                logger.info(f"Creating new collection '{self.collection_name}'")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config={
                        "size": vector_size,
                        "distance": self.distance,
                    },
                )
                # Create indices on filter fields so Qdrant can optimize
                # queries that filter by user_id and subject
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="user_id",
                    field_schema="integer",
                )
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="subject",
                    field_schema="keyword",
                )
                logger.info(f"Created indices on user_id and subject")
            except ConnectError as e:
                raise RuntimeError(f"Unable to create collection in Qdrant: {e}")
            except Exception as e:
                raise RuntimeError(
                    f"Failed to create Qdrant collection '{self.collection_name}': {e}"
                )
        else:
            logger.info(f"Collection '{self.collection_name}' already exists; preserving data")

        self._collection_initialized = True
        stats = self.get_collection_stats()
        logger.info(f"Collection '{self.collection_name}' initialized. Stats: {stats}")

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

        # auto-initialize if not yet done (safety measure for reload scenarios)
        if not self._collection_initialized:
            logger.warning("Collection not initialized; calling ensure_collection now")
            self.ensure_collection(vector_size=1536)

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
            logger.info(f"Upserting {len(points)} points to collection '{self.collection_name}'")
            if points:
                first_payload = points[0].payload
                logger.debug(f"Sample payload: user_id={first_payload.get('user_id')}, subject={first_payload.get('subject')}, document_name={first_payload.get('document_name')}")
            self.client.upsert(
                collection_name=self.collection_name,
                points=points,
            )
            logger.info(f"Successfully upserted {len(points)} points")
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
        # auto-initialize if not yet done (safety measure for reload scenarios)
        if not self._collection_initialized:
            logger.warning("Collection not initialized; calling ensure_collection now")
            self.ensure_collection(vector_size=1536)

        # Enforce that user_id is always provided; this is critical for
        # security and strict per-user isolation. Do not allow unauthenticated
        # or cross-user queries to reach the vector store.
        if user_id is None:
            raise RuntimeError("user_id is required for Qdrant searches to enforce per-user isolation")

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

        logger.info(f"Searching collection '{self.collection_name}' with filter: user_id={user_id}, subject='{subject}'")

        try:
            results = self.client.query_points(
                collection_name=self.collection_name,
                query=embedding,
                query_filter=query_filter,
                limit=top_k,
            ).points
            logger.info(f"Search returned {len(results)} points")
            return results
        except ConnectError as e:
            raise RuntimeError(
                f"Search failed: Qdrant is unreachable ({e})"
            )
        except Exception as e:
            raise RuntimeError(
                f"Search failed in Qdrant: {e}"
            )

    def get_collection_stats(self) -> dict:
        """Return metadata about the collection for debugging."""
        try:
            collection_info = self.client.get_collection(collection_name=self.collection_name)
            return {
                "points_count": collection_info.points_count,
                "vectors_count": getattr(collection_info, "vectors_count", "N/A"),
            }
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {}


# ----------------------------------------------------------------------
# Singleton instance (safe to import across app)
# ----------------------------------------------------------------------
qdrant_client = QdrantClientWrapper()