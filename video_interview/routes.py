import os, tempfile, json
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User, Profile, InterviewResult
from video_interview.analyzer import full_analysis

router = APIRouter(prefix="/video-interview", tags=["Video Interview"])


# ── Analyze + save ────────────────────────────────────────────────────────────
@router.post("/analyze")
async def analyze_interview(
    video:               UploadFile = File(...),
    questions:           str        = Form(...),   # JSON list
    job_title:           str        = Form("Software Engineer"),
    job_company:         str        = Form(""),
    job_location:        str        = Form(""),
    questions_answered:  int        = Form(0),     # how many Qs were recorded
    db: Session                     = Depends(get_db),
    current_user: User              = Depends(get_current_user),
):
    try:
        q_list = json.loads(questions)
        if not isinstance(q_list, list):
            q_list = [str(q_list)]
    except Exception:
        q_list = [questions]

    fname = (video.filename or "upload").lower()
    if not any(fname.endswith(ext) for ext in (".webm", ".mp4", ".mov", ".avi", ".mkv")):
        raise HTTPException(status_code=400, detail="Unsupported video format")

    suffix = os.path.splitext(fname)[-1] or ".webm"
    tmp    = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        tmp.write(await video.read())
        tmp.close()

        # Infer job role from profile if not provided
        role = job_title
        if role == "Software Engineer":
            profile = db.query(Profile).filter(
                Profile.user_email == current_user.email).first()
            if profile:
                work = profile.experience or []
                if work and isinstance(work[0], dict):
                    role = work[0].get("title", role)

        result = full_analysis(tmp.name, q_list, role, questions_answered)

        # ── Persist to DB ──────────────────────────────────────────────────
        speech  = result.get("speech", {})
        voice   = result.get("voice", {})
        eye     = result.get("eye_contact", {})
        posture = result.get("posture", {})

        record = InterviewResult(
            user_id           = current_user.id,
            user_email        = current_user.email,
            job_title         = job_title,
            job_company       = job_company,
            job_location      = job_location,
            overall_score     = result.get("overall_score"),
            voice_score       = voice.get("score"),
            eye_contact_score = eye.get("score"),
            posture_score     = posture.get("score"),
            content_score     = result.get("content_avg"),
            voice_label       = voice.get("label"),
            eye_contact_label = eye.get("label"),
            posture_label     = posture.get("label"),
            total_words       = speech.get("total_words"),
            words_per_min     = speech.get("words_per_min"),
            filler_count      = speech.get("filler_count"),
            filler_rate       = speech.get("filler_rate"),
            filler_pct        = speech.get("filler_pct"),
            repetitions       = speech.get("repetitions"),
            duration_sec      = speech.get("duration_sec"),
            full_results      = result,
            questions         = q_list,
            interview_type    = "video",
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return JSONResponse(content={**result, "result_id": record.id})

    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Analysis failed: {traceback.format_exc()}")
    finally:
        if os.path.exists(tmp.name):
            os.remove(tmp.name)


# ── Generate personalized questions ──────────────────────────────────────────
@router.get("/questions")
def get_interview_questions(
    job_title: str = "Software Engineer",
    job_desc: str = "",
    num_questions: int = 5,
    job_skills: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from groq import Groq
    from dotenv import load_dotenv
    load_dotenv()

    GROQ_API_KEY = os.getenv("GROQ_API_KEY_TEXTINTERVIEW") or os.getenv("GROQ_API_KEY")

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Missing GROQ API key")

    client = Groq(api_key=GROQ_API_KEY)

    profile = db.query(Profile).filter(
        Profile.user_email == current_user.email
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    personal_info = profile.personal_info if isinstance(profile.personal_info, dict) else {}
    education     = profile.education if profile.education else []
    experience    = profile.experience if profile.experience else []
    skills        = profile.skills if profile.skills else []

    education_str  = ', '.join([
        f"{edu.get('degree', '')} in {edu.get('field_of_study', '')}"
        for edu in education if isinstance(edu, dict)
    ]) or "N/A"

    experience_str = ', '.join([
        f"{exp.get('title', '')} at {exp.get('company', '')}"
        for exp in experience if isinstance(exp, dict)
    ]) or "N/A"

    skills_str     = ', '.join(skills) if skills else "N/A"
    job_skills_str = job_skills if job_skills else "N/A"

    prompt = f"""
You are a senior technical interviewer.

Generate {num_questions} advanced, high-quality interview questions.

Job Info:
Title: {job_title}
Description: {job_desc[:500]}...
Required Skills: {job_skills_str}

Candidate Profile:
Name: {personal_info.get('name', 'N/A')}
Education: {education_str}
Skills: {skills_str}
Experience: {experience_str}

Rules:
- This is for a verbal interview so keep questions accordingly which are easy to answer verbally
- Questions must be STRICTLY relevant to the job
- Focus on the technical aspect
- Include system design, problem-solving, trade-offs
- Tailor difficulty to candidate experience
- Avoid generic questions
- Return ONLY the questions, one per line
- DO NOT return JSON
- DO NOT add explanations
- Format:
1. Question
2. Question
"""

    try:
        r = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )

        text = r.choices[0].message.content.strip()

        lines = []
        for line in text.split("\n"):
            line = line.strip()
            if line and (
                line[0].isdigit() or
                line.startswith("-") or
                line.startswith("•")
            ):
                cleaned = line.lstrip('0123456789.-•) ').strip()
                if cleaned:
                    lines.append(cleaned)

        if not lines:
            lines = [l.strip() for l in text.split("\n") if l.strip()]

        if len(lines) < num_questions:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate enough questions"
            )

        return {"questions": lines[:num_questions]}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Question generation failed: {str(e)}"
        )


# ── History ───────────────────────────────────────────────────────────────────
@router.get("/history")
def get_interview_history(
    db: Session        = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = (
        db.query(InterviewResult)
        .filter(InterviewResult.user_email == current_user.email)
        .order_by(InterviewResult.created_at.desc())
        .all()
    )
    return {
        "count": len(records),
        "results": [
            {
                "id":                r.id,
                "job_title":         r.job_title,
                "job_company":       r.job_company,
                "job_location":      r.job_location,
                "overall_score":     float(r.overall_score or 0),
                "voice_score":       float(r.voice_score or 0),
                "eye_contact_score": float(r.eye_contact_score or 0),
                "posture_score":     float(r.posture_score or 0),
                "content_score":     float(r.content_score or 0),
                "voice_label":       r.voice_label,
                "eye_contact_label": r.eye_contact_label,
                "posture_label":     r.posture_label,
                "total_words":       r.total_words,
                "words_per_min":     float(r.words_per_min or 0),
                "filler_count":      r.filler_count,
                "filler_rate":       float(r.filler_rate or 0),
                "duration_sec":      float(r.duration_sec or 0),
                "interview_type":    r.interview_type,
                "created_at":        r.created_at.isoformat() if r.created_at else None,
                "questions":         r.questions or [],
            }
            for r in records
        ],
    }


# ── Single result detail ──────────────────────────────────────────────────────
@router.get("/history/{result_id}")
def get_interview_detail(
    result_id: int,
    db: Session        = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = db.query(InterviewResult).filter(
        InterviewResult.id == result_id,
        InterviewResult.user_email == current_user.email,
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Result not found")
    return {**r.full_results, "result_id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "questions": r.questions or []}