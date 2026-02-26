"""Business logic for authentication."""

from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import os

from .models import User
from .schemas import UserRegister, UserLogin, Token, TokenData


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))


class AuthService:
    """Service class for authentication operations."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against a hashed password."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_access_token(user_id: int, email: str) -> str:
        """
        Create a JWT access token with user information.
        
        Args:
            user_id: The user's ID
            email: The user's email
            
        Returns:
            JWT token string
        """
        payload = {
            "user_id": user_id,
            "email": email,
            "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            "iat": datetime.utcnow()
        }
        encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def verify_token(token: str) -> TokenData:
        """
        Verify and decode a JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            TokenData with user_id and email
            
        Raises:
            JWTError: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: int = payload.get("user_id")
            email: str = payload.get("email")
            
            if user_id is None or email is None:
                raise JWTError("Invalid token payload")
                
            return TokenData(user_id=user_id, email=email)
        except JWTError as e:
            raise JWTError(f"Could not validate credentials: {str(e)}")

    @staticmethod
    def register_user(user_data: UserRegister, db: Session) -> User:
        """
        Register a new user.
        
        Args:
            user_data: UserRegister schema with name, email, password
            db: Database session
            
        Returns:
            Created User object
            
        Raises:
            ValueError: If email already exists
        """
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise ValueError(f"Email {user_data.email} is already registered")

        # Hash password and create user
        hashed_password = AuthService.hash_password(user_data.password)
        db_user = User(
            name=user_data.name,
            email=user_data.email,
            hashed_password=hashed_password
        )

        try:
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            return db_user
        except IntegrityError:
            db.rollback()
            raise ValueError(f"Email {user_data.email} is already registered")

    @staticmethod
    def login_user(credentials: UserLogin, db: Session) -> Token:
        """
        Authenticate user and generate JWT token.
        
        Args:
            credentials: UserLogin schema with email and password
            db: Database session
            
        Returns:
            Token with access_token and token_type
            
        Raises:
            ValueError: If credentials are invalid
        """
        # Find user by email
        user = db.query(User).filter(User.email == credentials.email).first()
        if not user:
            raise ValueError("Invalid email or password")

        # Verify password
        if not AuthService.verify_password(credentials.password, user.hashed_password):
            raise ValueError("Invalid email or password")

        # Create and return token
        access_token = AuthService.create_access_token(user.id, user.email)
        return Token(access_token=access_token, token_type="bearer")

    @staticmethod
    def get_current_user(token: str, db: Session) -> User:
        """
        Get current user from JWT token.
        
        Args:
            token: JWT token string
            db: Database session
            
        Returns:
            User object
            
        Raises:
            ValueError: If user not found
            JWTError: If token is invalid
        """
        token_data = AuthService.verify_token(token)
        
        user = db.query(User).filter(User.id == token_data.user_id).first()
        if not user:
            raise ValueError("User not found")
            
        return user
