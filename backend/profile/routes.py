"""FastAPI router for profile-related endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from authentication.routes import get_current_user
from authentication.models import User

from .schemas import ProfileCreate, ProfileResponse
from .services import ProfileService


# router for profile operations
router = APIRouter(prefix="/profile", tags=["profile"])


@router.post("/", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def upsert_profile(
    profile_data: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    """Create or update the current user's profile with three subjects."""
    profile = ProfileService.create_or_update_profile(
        user_id=current_user.id,
        subject1=profile_data.subject1,
        subject2=profile_data.subject2,
        subject3=profile_data.subject3,
        db=db,
    )
    return ProfileResponse.model_validate(profile)


@router.get("/", response_model=ProfileResponse, status_code=status.HTTP_200_OK)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    """Retrieve the current user's profile."""
    profile = ProfileService.get_profile_by_user(current_user.id, db)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    return ProfileResponse.model_validate(profile)