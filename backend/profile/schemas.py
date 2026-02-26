"""Pydantic schemas for profile endpoints."""

from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime


class ProfileBase(BaseModel):
    """Base schema with common profile fields."""

    subject1: str
    subject2: str
    subject3: str

    @validator("subject1", "subject2", "subject3")
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("subject names must be non-empty strings")
        return v


class ProfileCreate(ProfileBase):
    """Schema used when creating or updating a profile."""

    class Config:
        json_schema_extra = {
            "example": {
                "subject1": "Mathematics",
                "subject2": "Physics",
                "subject3": "Chemistry"
            }
        }


class ProfileResponse(ProfileBase):
    """Schema returned to clients after profile operations."""

    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True