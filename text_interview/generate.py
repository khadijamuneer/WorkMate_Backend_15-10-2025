from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from groq import Groq
import json
from database import get_db
from models import Profile
from dotenv import load_dotenv
import os 


router = APIRouter()

# Initialize Groq client



load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY_TEXTINTERVIEW")

if not GROQ_API_KEY:
    raise ValueError("Missing GROQ_API_KEY_INTERVIEW")

client = Groq(api_key=GROQ_API_KEY)


class InterviewRequest(BaseModel):
    email: str
    job_title: str
    job_description: str
    job_skills: list[str] = []
    n_questions: int = 5

class InterviewResponse(BaseModel):
    questions: list[str]

@router.post("/generate", response_model=InterviewResponse)
async def generate_interview_questions(
    request: InterviewRequest,
    db: Session = Depends(get_db)
):
    """
    Generate personalized interview questions based on user profile and job description.
    """
    # Fetch user profile from database
    profile = db.query(Profile).filter(Profile.user_email == request.email).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please complete your profile first.")
    
    # Extract profile data
    personal_info = profile.personal_info if isinstance(profile.personal_info, dict) else {}
    education = profile.education if profile.education else []
    experience = profile.experience if profile.experience else []
    skills = profile.skills if profile.skills else []
    
    # Build education string
    education_str = ', '.join([
        f"{edu.get('degree', '')} in {edu.get('field_of_study', '')}" 
        for edu in education if edu.get('degree')
    ]) or "N/A"
    
    # Build experience string
    experience_str = ', '.join([
        f"{exp.get('title', '')} at {exp.get('company', '')}" 
        for exp in experience if exp.get('title')
    ]) or "N/A"
    
    # Build skills string
    skills_str = ', '.join(skills) if skills else "N/A"
    job_skills_str = ', '.join(request.job_skills) if request.job_skills else "N/A"
    
    # Construct the prompt
    prompt = f"""
You are a senior technical interviewer.
Generate {request.n_questions} advanced, technical interview questions for a candidate applying to this job:

Job Info:
Title: {request.job_title}
Description: {request.job_description[:500]}...
Required Skills: {job_skills_str}

Candidate Profile:
Name: {personal_info.get('name', 'N/A')}
Education: {education_str}
Skills: {skills_str}
Experience: {experience_str}

Rules:
- Questions must be strictly relevant to the job requirements.
- Include deep technical concepts, algorithms, architectures, problem-solving, trade-offs.
- Tailor difficulty to candidate's profile and job level.
- Return ONLY the questions, one per line, numbered 1-{request.n_questions}.
- NO introductions, explanations, or extra text.
- Questions should be open-ended and test both technical knowledge and practical application.
"""
    
    try:
        # Generate using Groq
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        
        text = response.choices[0].message.content.strip()
        
        # Parse questions (lines starting with numbers)
        lines = []
        for line in text.split("\n"):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                # Remove numbering/bullets
                cleaned = line.lstrip('0123456789.-•) ').strip()
                if cleaned:
                    lines.append(cleaned)
        
        # Fallback if parsing fails
        if not lines:
            lines = [line.strip() for line in text.split("\n") if line.strip()][:request.n_questions]
        
        # Ensure we have the requested number of questions
        if len(lines) < request.n_questions:
            raise HTTPException(
                status_code=500, 
                detail="Failed to generate enough questions. Please try again."
            )
        
        return InterviewResponse(questions=lines[:request.n_questions])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating questions: {str(e)}")
