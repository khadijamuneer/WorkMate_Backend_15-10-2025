
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Profile, User
from schemas import ProfileCreate, ProfileResponse
from auth import get_current_user
import json

router = APIRouter(prefix="/profile", tags=["Profile"])

# ✅ Create a new profile
@router.post("/", response_model=ProfileResponse)
def create_profile(profile_data: ProfileCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Use logged-in user only
    user = current_user

    existing = db.query(Profile).filter(Profile.user_email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")

    new_profile = Profile(
        user_id=user.id,
        user_email=user.email,
        personal_info=profile_data.personal_info.dict(),
        education=[e.dict() for e in profile_data.education],
        experience=[w.dict() for w in profile_data.work],
        projects=[p.dict() for p in profile_data.projects],
        skills=profile_data.skills,
    )

    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    # Convert JSONB fields to dict/list before returning
    return {
        "id": new_profile.id,
        "user_email": new_profile.user_email,
        "personal_info": new_profile.personal_info,
        "skills": new_profile.skills or [],
        "education": new_profile.education or [],
        "work": new_profile.experience or [],
        "projects": new_profile.projects or [],
    }


# ✅ Get profile of logged-in user
@router.get("/", response_model=ProfileResponse)
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = db.query(Profile).filter(Profile.user_email == current_user.email).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Ensure JSONB fields are proper Python objects
    personal_info = profile.personal_info
    if isinstance(personal_info, str):
        personal_info = json.loads(personal_info)

    return {
        "id": profile.id,
        "user_email": profile.user_email,
        "personal_info": personal_info,
        "skills": profile.skills or [],
        "education": profile.education or [],
        "work": profile.experience or [],
        "projects": profile.projects or [],
    }


# ✅ Update existing profile of logged-in user
@router.put("/", response_model=ProfileResponse)
def update_profile(profile_data: ProfileCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = db.query(Profile).filter(Profile.user_email == current_user.email).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile.personal_info = profile_data.personal_info.dict()
    profile.education = [e.dict() for e in profile_data.education]
    profile.experience = [w.dict() for w in profile_data.work]
    profile.projects = [p.dict() for p in profile_data.projects]
    profile.skills = profile_data.skills

    db.commit()
    db.refresh(profile)

    return {
        "id": profile.id,
        "user_email": profile.user_email,
        "personal_info": profile.personal_info,
        "skills": profile.skills or [],
        "education": profile.education or [],
        "work": profile.experience or [],
        "projects": profile.projects or [],
    }
