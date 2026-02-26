"""Main FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import database initialization
from database import init_db

# Import authentication router
from authentication.routes import router as auth_router

# Import profile router (models imported via routes)
from profile import router as profile_router

# Import document router for chunk store
from doc_chunk_store import router as doc_router

# Initialize database tables (after routers are imported so their models are registered)
init_db()

# Create FastAPI app
app = FastAPI(
    title="AskMyNotes API",
    description="Backend API for AskMyNotes with JWT authentication",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(doc_router)
from doc_chunk_store.qdrant_client import qdrant_client

@app.on_event("startup")
def startup():
    # Use the SAME embedding dimension as your model
    qdrant_client.ensure_collection(vector_size=1536)


@app.get("/", tags=["health"])
async def root():
    """Health check endpoint."""
    return {
        "message": "AskMyNotes API is running",
        "version": "1.0.0",
        "auth_endpoints": {
            "register": "POST /auth/register",
            "login": "POST /auth/login",
            "me": "GET /auth/me"
        }
    }


@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
