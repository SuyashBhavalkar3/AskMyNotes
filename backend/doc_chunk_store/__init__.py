"""Package initializer for the document chunk store.

Expose the APIRouter instance at the package level so callers can do:

    from doc_chunk_store import router

The side effect of importing :mod:`router` also loads any models, which is
necessary before calling ``init_db()`` in ``main.py``.
"""

from .router import router
