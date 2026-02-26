"""Pydantic schemas for authentication."""

from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    """Base user schema with common fields."""
    
    name: str
    email: EmailStr


class UserRegister(BaseModel):
    """Schema for user registration."""
    
    name: str
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "password": "SecurePassword123!"
            }
        }


class UserLogin(BaseModel):
    """Schema for user login."""
    
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john@example.com",
                "password": "SecurePassword123!"
            }
        }


class UserResponse(UserBase):
    """Schema for user response."""
    
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for JWT token response."""
    
    access_token: str
    token_type: str

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer"
            }
        }


class TokenData(BaseModel):
    """Schema for token payload data."""
    
    user_id: int
    email: str
