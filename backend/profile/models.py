"""SQLAlchemy model for user profile subjects."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from database import Base


class Profile(Base):
    """Profile model storing three subject names for a user."""

    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    subject1: Mapped[str] = mapped_column(String(255), nullable=False)
    subject2: Mapped[str] = mapped_column(String(255), nullable=False)
    subject3: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # relationship back to user (one-to-one)
    user = relationship("User", backref="profile", uselist=False)

    def __repr__(self) -> str:
        return f"<Profile(user_id={self.user_id})>"