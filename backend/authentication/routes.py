"""FastAPI router for authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError

from database import get_db
from .schemas import UserRegister, UserLogin, Token, UserResponse
from .services import AuthService
from .models import User

# Create router
router = APIRouter(prefix="/auth", tags=["authentication"])

# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token in Authorization header.
    
    Args:
        credentials: HTTP Bearer credentials
        db: Database session
        
    Returns:
        Current User object
        
    Raises:
        HTTPException 401: If token is invalid or user not found
    """
    token = credentials.credentials
    try:
        user = AuthService.get_current_user(token, db)
        return user
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
) -> UserResponse:
    """
    Register a new user.
    
    Args:
        user_data: User registration data (name, email, password)
        db: Database session
        
    Returns:
        Created user information (id, name, email, created_at)
        
    Raises:
        HTTPException 400: If email is already registered
    """
    try:
        user = AuthService.register_user(user_data, db)
        return UserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=Token, status_code=status.HTTP_200_OK)
async def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
) -> Token:
    """
    Login user and return JWT access token.
    
    Args:
        credentials: User login credentials (email, password)
        db: Database session
        
    Returns:
        JWT token with access_token and token_type
        
    Raises:
        HTTPException 401: If credentials are invalid
    """
    try:
        token = AuthService.login_user(credentials, db)
        return token
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Get current authenticated user information.
    Requires valid JWT token in Authorization header.
    
    Args:
        current_user: Current authenticated user from token
        
    Returns:
        Current user information (id, name, email, created_at)
        
    Raises:
        HTTPException 401: If token is invalid or expired
    """
    return UserResponse.model_validate(current_user)
