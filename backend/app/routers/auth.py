from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import bcrypt
from .. import crud, schemas, models
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["authentication"])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_audit_log(db: Session, user_id: int, action_type: str, description: str):
    """Helper function to create audit log entries"""
    audit_log = models.AuditLog(
        user_id=user_id,
        action_type=action_type,
        description=description,
        timestamp=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()
    return audit_log

@router.post("/login")
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return user info with technician_id if applicable"""
    user = db.query(models.User).filter(
        models.User.username == credentials.username
    ).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create audit log
    create_audit_log(
        db,
        user.user_id,
        "LOGIN",
        f"User {user.username} logged in"
    )
    
    # Get technician_id if user is a technician
    technician_id = None
    if user.role == 'Technician':
        technician = db.query(models.Technician).filter(
            models.Technician.user_id == user.user_id
        ).first()
        if technician:
            technician_id = technician.technician_id
    
    return {
        "user_id": user.user_id,
        "username": user.username,
        "role": user.role,
        "last_login": user.last_login,
        "technician_id": technician_id  # NEW: Include technician_id
    }

@router.post("/logout")
def logout(user_id: int, db: Session = Depends(get_db)):
    """Log user logout activity"""
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    
    if user:
        create_audit_log(
            db,
            user_id,
            "LOGOUT",
            f"User {user.username} logged out"
        )
    
    return {"message": "Logged out successfully"}

@router.get("/users", response_model=List[schemas.User])
def get_all_users(db: Session = Depends(get_db)):
    """Get all users (Admin only in production)"""
    return db.query(models.User).all()

@router.get("/users/{user_id}", response_model=schemas.User)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user"""
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Create a new user (Admin only in production)"""
    # Check if username exists
    existing = db.query(models.User).filter(
        models.User.username == user.username
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password
    hashed = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    db_user = models.User(
        username=user.username,
        password_hash=hashed,
        role=user.role
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user (Admin only in production)"""
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}