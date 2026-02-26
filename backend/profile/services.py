"""Business logic for profile management."""
from sqlalchemy.orm import Session
from .models import Profile


class ProfileService:
    """Service class for profile operations.""" 

    @staticmethod
    def create_or_update_profile(user_id: int, subject1: str, subject2: str, subject3: str, db: Session) -> Profile:
        """Create a new profile or update the existing one for the user."""
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        if profile:
            profile.subject1 = subject1
            profile.subject2 = subject2
            profile.subject3 = subject3
        else:
            profile = Profile(
                user_id=user_id,
                subject1=subject1,
                subject2=subject2,
                subject3=subject3,
            )
            db.add(profile)

        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def get_profile_by_user(user_id: int, db: Session) -> Profile | None:
        """Retrieve the profile belonging to a specific user."""
        return db.query(Profile).filter(Profile.user_id == user_id).first()