"""Embedding generation logic.

This module defines a simple provider interface and ships with a very basic
"mock" implementation.  In production you would swap the provider for
something that calls OpenAI, Cohere, etc.  The rest of the system only
interacts with the two helper functions ``get_embedding`` and
``get_embeddings`` so the change is transparent.
"""

from typing import List
import os


class EmbeddingsProvider:
    def embed(self, texts: List[str]) -> List[List[float]]:
        raise NotImplementedError()


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


# choose a provider based on an environment variable; default to the mock
_provider_name = os.getenv("EMBEDDING_PROVIDER", "mock").lower()
if _provider_name == "mock":
    provider: EmbeddingsProvider = MockProvider(dim=int(os.getenv("EMBEDDING_DIM", "1536")))
else:
    # placeholder for future real providers
    provider = MockProvider(dim=int(os.getenv("EMBEDDING_DIM", "1536")))


# convenience helpers used by the rest of the codebase

def get_embedding(text: str) -> List[float]:
    return provider.embed([text])[0]


def get_embeddings(texts: List[str]) -> List[List[float]]:
    return provider.embed(texts)
