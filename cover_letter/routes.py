from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import io

from database import get_db
from models import Profile
from auth import get_current_user
from models import User
from cover_letter.generator import generate_cover_letter_pdf, ADDRESSING_OPTIONS

router = APIRouter(prefix="/cover-letter", tags=["Cover Letter"])


class JobInfo(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    full_desc: Optional[str] = None
    preview_desc: Optional[str] = None
    skills: Optional[List[str]] = []


class CoverLetterRequest(BaseModel):
    job: JobInfo
    addressing_key: Optional[str] = "hiring_manager"


@router.get("/addressing-options")
def get_addressing_options():
    """Return available addressing options for the dropdown."""
    return {
        "options": [
            {"key": k, "label": v.replace(",", "")}
            for k, v in ADDRESSING_OPTIONS.items()
        ]
    }


@router.post("/generate")
def generate_cover_letter(
    request: CoverLetterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Fetch user profile
    profile_db = db.query(Profile).filter(
        Profile.user_email == current_user.email
    ).first()

    if not profile_db:
        raise HTTPException(status_code=404, detail="Profile not found. Please complete your profile first.")

    profile = {
        "personal_info": profile_db.personal_info or {},
        "skills": profile_db.skills or [],
        "education": profile_db.education or [],
        "work": profile_db.experience or [],
        "projects": profile_db.projects or [],
    }

    job = request.job.dict()

    try:
        pdf_bytes = generate_cover_letter_pdf(
            profile=profile,
            job=job,
            addressing_key=request.addressing_key or "hiring_manager",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=cover_letter.pdf"},
    )