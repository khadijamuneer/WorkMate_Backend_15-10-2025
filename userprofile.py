from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Profile, User
from schemas import ProfileCreate, ProfileResponse
import json

router = APIRouter(prefix="/profile", tags=["Profile"])

# ✅ Create a new profile
@router.post("/", response_model=ProfileResponse)
def create_profile(profile_data: ProfileCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == profile_data.personal_info.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Profile).filter(Profile.user_email == profile_data.personal_info.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")

    new_profile = Profile(
        user_id=user.id,
        user_email=profile_data.personal_info.email,
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


# ✅ Get profile by email
@router.get("/{email}", response_model=ProfileResponse)
def get_profile(email: str, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_email == email).first()
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


# ✅ Update existing profile
@router.put("/{email}", response_model=ProfileResponse)
def update_profile(email: str, profile_data: ProfileCreate, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_email == email).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile.personal_info = profile_data.personal_info.dict()
    profile.education = [e.dict() for e in profile_data.education]
    profile.experience = [w.dict() for w in profile_data.work]
    profile.projects = [p.dict() for p in profile_data.projects]
    profile.skills = profile_data.skills

    db.commit()
    db.refresh(profile)

    # Convert JSONB fields to dict/list before returning
    return {
        "id": profile.id,
        "user_email": profile.user_email,
        "personal_info": profile.personal_info,
        "skills": profile.skills or [],
        "education": profile.education or [],
        "work": profile.experience or [],
        "projects": profile.projects or [],
    }