"""Text chunking utilities.

The chunker is intentionally simple: it slices the incoming string into
fixed-size pieces with an overlap.  This avoids breaking raw tokens in the
middle and provides a small amount of redundancy which often improves
retrieval quality.  Both size and overlap are configurable via environment
variables so you can tune them without changing code.
"""

from typing import List


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Split *text* into chunks of approximately ``chunk_size`` characters.

    ``overlap`` characters from the end of one chunk will also appear at the
    beginning of the next chunk.  If ``chunk_size`` is less than or equal to
    zero an error is raised.
    """

    if chunk_size <= 0:
        raise ValueError("chunk_size must be > 0")
    if overlap < 0:
        overlap = 0

    chunks: List[str] = []
    start = 0
    length = len(text)
    while start < length:
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks
