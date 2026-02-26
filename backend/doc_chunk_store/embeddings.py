"""Embedding generation logic.

This module defines a simple provider interface and ships with a very basic
"mock" implementation.  In production you would swap the provider for
something that calls OpenAI, Cohere, etc.  The rest of the system only
interacts with the two helper functions ``get_embedding`` and
``get_embeddings`` so the change is transparent.
"""

from typing import List
import os
import logging

from dotenv import load_dotenv
from openai import OpenAI

# load environment variables early so providers see them immediately
load_dotenv()


class EmbeddingsProvider:
    def embed(self, texts: List[str]) -> List[List[float]]:
        raise NotImplementedError()


class OpenAIProvider(EmbeddingsProvider):
    """Provider backed by the OpenAI Embeddings API.

    This implementation is deliberately **locked** to
    ``text-embedding-3-small``; other models are not supported.  The
    environment variable exists only so we can validate that users
    haven't accidentally pointed at a different model.
    """

    def __init__(self, model: str | None = None, dim: int | None = None):
        # resolve desired model (env variable optional)
        requested = model or os.getenv("OPENAI_EMBEDDING_MODEL")
        if requested and requested != "text-embedding-3-small":
            raise RuntimeError(
                f"Unsupported embedding model '{requested}', only 'text-embedding-3-small' is allowed"
            )
        self.model = "text-embedding-3-small"

        # ensure the dimension matches expectation (1536 for this model)
        self.dim = dim or int(os.getenv("EMBEDDING_DIM", "1536"))
        if self.dim != 1536:
            raise RuntimeError("Embedding dimension must be 1536 for text-embedding-3-small")

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY must be set to use OpenAIProvider")
        # create a client instance for API v2.x
        self.client = OpenAI(api_key=api_key)
        logging.getLogger(__name__).info("OpenAI embedding model set to %s", self.model)

    def embed(self, texts: List[str]) -> List[List[float]]:
        # handle edge cases: convert None/empty to single space so API doesn't error
        sanitized = [t if t and t.strip() else " " for t in texts]
        if not sanitized:
            return []
        # use the new client-based interface
        response = self.client.embeddings.create(model=self.model, input=sanitized)
        vectors = [item.embedding for item in response.data]
        logging.getLogger(__name__).debug("Received %d embeddings of dimension %d from OpenAI", len(vectors), len(vectors[0]) if vectors else 0)
        # validate size
        for v in vectors:
            if len(v) != self.dim:
                raise RuntimeError(
                    f"Embedding dimension {len(v)} does not match expected {self.dim}"
                )
        return vectors


class MockProvider(EmbeddingsProvider):
    def __init__(self, dim: int = 1536):
        # dimensionality can be configured via environment variable; 1536 is
        # the standard size for many modern models (e.g. OpenAI text-embedding-3-large).
        self.dim = dim

    def embed(self, texts: List[str]) -> List[List[float]]:
        # a deterministic pseudo-random vector based on the hash of the
        # string.  This is *not* a real embedding, but it makes unit tests
        # deterministic and keeps the dependency surface small.
        vectors: List[List[float]] = []
        for t in texts:
            h = abs(hash(t))
            vec = [(h >> (i % 64)) % 100 / 100.0 for i in range(self.dim)]
            vectors.append(vec)
        return vectors


# choose a provider based on an environment variable; default to
# OpenAI if an API key is available, otherwise fall back to the mock.
_provider_name = os.getenv("EMBEDDING_PROVIDER")
if _provider_name:
    choice = _provider_name.lower()
else:
    # auto-select: prefer OpenAI when key present
    choice = "openai" if os.getenv("OPENAI_API_KEY") else "mock"

if choice == "openai":
    # OpenAIProvider will raise if the API key is missing
    provider: EmbeddingsProvider = OpenAIProvider(
        model=os.getenv("OPENAI_EMBEDDING_MODEL"),
        dim=int(os.getenv("EMBEDDING_DIM", "1536")),
    )
elif choice == "mock":
    provider = MockProvider(dim=int(os.getenv("EMBEDDING_DIM", "1536")))
else:
    raise RuntimeError(f"Unknown EMBEDDING_PROVIDER '{choice}'")


import logging

# convenience helpers used by the rest of the codebase

def embed_text(text: str) -> List[float]:
    """Return a single embedding vector for *text*."""
    return provider.embed([text])[0]


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Return embeddings for a list of texts."""
    return provider.embed(texts)

# backwards compatibility aliases used elsewhere
get_embedding = embed_text
get_embeddings = embed_texts


def get_provider_name() -> str:
    """Return the lowercase name of the currently active provider."""
    return provider.__class__.__name__.lower()


def using_openai() -> bool:
    """True if the active provider is the OpenAI-based implementation."""
    return isinstance(provider, OpenAIProvider)

# log which provider we selected at import time
logging.getLogger(__name__).info("Embedding provider: %s", get_provider_name())
