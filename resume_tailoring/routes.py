from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from sqlalchemy.orm import Session
import sys
import os
from groq import Groq
from dotenv import load_dotenv


# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from resume_tailoring.tailor import tailor_resume, get_groq_client
from database import get_db
from models import Profile

router = APIRouter(prefix="/tailor", tags=["Resume Tailoring"])


load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY_TAILORING")

if not GROQ_API_KEY:
    raise ValueError("Missing GROQ_API_KEY_TAILORING")

client = Groq(api_key=GROQ_API_KEY)

@router.post("/resume")
async def tailor_resume_endpoint(request: Dict, db: Session = Depends(get_db)):
    """
    Accepts user email and job details, tailors the resume, and returns tailored JSON.
    
    Expected request body:
    {
        "email": "user@example.com",
        "job": {
            "title": "Senior Software Engineer",
            "company": "TechCorp",
            "full_desc": "Full job description text...",
            "preview_desc": "Preview of job...",
            "skills": ["Python", "React", "FastAPI"]
        }
    }
    """
    try:
        email = request.get("email")
        job = request.get("job")
        
        if not email or not job:
            raise HTTPException(status_code=400, detail="Email and job details are required")
        
        # Fetch user profile from database using SQLAlchemy ORM
        profile_orm = db.query(Profile).filter(Profile.user_email == email).first()
        
        if not profile_orm:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Convert ORM object to dict format expected by tailor_resume
        profile = {
            "personal_info": profile_orm.personal_info,
            "skills": profile_orm.skills or [],
            "experience": profile_orm.experience or [],
            "projects": profile_orm.projects or [],
            "education": profile_orm.education or []
        }
        
        # Initialize Groq client
        groq_client = get_groq_client(GROQ_API_KEY)
        
        # Tailor the resume
        tailored_data = tailor_resume(profile, job, groq_client)
        
        return {
            "success": True,
            "tailored_resume": tailored_data
        }
        
    except Exception as e:
        print(f"Error tailoring resume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to tailor resume: {str(e)}")


@router.post("/generate-pdf")
async def generate_tailored_pdf(request: Dict, db: Session = Depends(get_db)):
    """
    Accepts tailored resume data + original profile data, merges them, 
    and generates a PDF.
    
    Expected request body:
    {
        "email": "user@example.com",
        "tailored_data": {...},  // Output from tailor_resume
        "original_profile": {...}  // Full user profile (optional, will fetch if not provided)
    }
    """
    try:
        import json
        print("DEBUG — Incoming request to /generate-pdf:")
        print(json.dumps(request, indent=2))
        print("Type of request:", type(request))
        from resume_builder.generator import generate_resume
        from fastapi.responses import FileResponse
        import uuid
        
        email = request.get("email")
        tailored_data = request.get("tailored_data")
        original_profile = request.get("original_profile")
        
        if not tailored_data:
            raise HTTPException(status_code=400, detail="Tailored data required")
        
        # If original_profile not provided, fetch from database
        if not original_profile:
            if not email:
                raise HTTPException(status_code=400, detail="Email required to fetch profile")
            
            profile_orm = db.query(Profile).filter(Profile.user_email == email).first()
            if not profile_orm:
                raise HTTPException(status_code=404, detail="Profile not found")
            
            # Convert ORM to dict
            original_profile = {
                "personal_info": profile_orm.personal_info,
                "skills": profile_orm.skills or [],
                "work": profile_orm.experience or [],
                "projects": profile_orm.projects or [],
                "education": profile_orm.education or []
            }
        
        # Merge tailored data with original profile
        merged_profile = merge_tailored_with_profile(tailored_data, original_profile)
        
        # Generate PDF
        unique_filename = f"tailored_resume_{uuid.uuid4().hex}.pdf"
        pdf_path = generate_resume(merged_profile, output_pdf=unique_filename)
        
        return FileResponse(
            path=pdf_path,
            filename="tailored_resume.pdf",
            media_type="application/pdf"
        )
        
    except Exception as e:
        print(f"Error generating tailored PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


def merge_tailored_with_profile(tailored_data: Dict, original_profile: Dict) -> Dict:
    """
    Merges tailored resume data with original profile, keeping structure intact.
    This ensures the LaTeX template receives data in the expected format.
    """
    merged = original_profile.copy()
    
    # Replace summary if it exists in tailored data
    if "tailored_summary" in tailored_data:
        merged["summary"] = tailored_data["tailored_summary"]
    
    # Replace skills with tailored skills (prioritized)
    if "tailored_skills" in tailored_data and tailored_data["tailored_skills"]:
        merged["skills"] = tailored_data["tailored_skills"]
    
    # Replace experience bullets with tailored versions
    if "tailored_experience" in tailored_data and tailored_data["tailored_experience"]:
        tailored_exp = tailored_data["tailored_experience"]
        original_exp = merged.get("work", [])
        
        # Match by company and role
        for i, exp in enumerate(original_exp):
            # Try to find matching tailored experience
            matching_tailored = None
            for t in tailored_exp:
                # Match by company name (case-insensitive)
                if (t.get("company", "").lower() == exp.get("company", "").lower() and
                    t.get("role", "").lower() == exp.get("title", "").lower()):
                    matching_tailored = t
                    break
            
            if matching_tailored and matching_tailored.get("bullets"):
                # Replace bullets but keep other fields (dates, location, etc.)
                original_exp[i]["desc"] = matching_tailored["bullets"]
        
        merged["work"] = original_exp
    
    # Replace project bullets with tailored versions
    if "tailored_projects" in tailored_data and tailored_data["tailored_projects"]:
        tailored_proj = tailored_data["tailored_projects"]
        original_proj = merged.get("projects", [])
        
        for i, proj in enumerate(original_proj):
            # Try to find matching tailored project
            matching_tailored = None
            for t in tailored_proj:
                if t.get("name", "").lower() == proj.get("title", "").lower():
                    matching_tailored = t
                    break
            
            if matching_tailored and matching_tailored.get("bullets"):
                original_proj[i]["desc"] = matching_tailored["bullets"]
        
        merged["projects"] = original_proj
    
    return merged
