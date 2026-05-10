"""
skills/routes.py
----------------
FastAPI router for the Skills Prediction feature.

Endpoints:
  GET  /skills/trending?role=<title>   → trending skills chart data
  GET  /skills/gaps                    → authenticated user's gap analysis
  POST /skills/recommend               → Groq AI roadmap generation
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from auth import get_current_user          # reuse your existing JWT dependency
from models import User

from .service import (
    fetch_esco_skills_for_occupation,
    get_skill_frequencies_from_db,
    rank_trending_skills,
    compute_skill_gaps,
    generate_recommendations_groq,
    get_user_profile,
)

router = APIRouter(prefix="/skills", tags=["skills"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RecommendRequest(BaseModel):
    skill_gaps: list[str]
    target_role: str | None = None


# ---------------------------------------------------------------------------
# Static course suggestions (extend with a real DB table later)
# ---------------------------------------------------------------------------

COURSE_MAP = {
    "python":           {"title": "Python for Everybody",              "platform": "Coursera", "url": "https://coursera.org/specializations/python"},
    "sql":              {"title": "SQL for Data Science",              "platform": "Coursera", "url": "https://coursera.org/learn/sql-for-data-science"},
    "machine learning": {"title": "ML Specialization (Andrew Ng)",     "platform": "Coursera", "url": "https://coursera.org/specializations/machine-learning-introduction"},
    "deep learning":    {"title": "Deep Learning Specialization",      "platform": "Coursera", "url": "https://coursera.org/specializations/deep-learning"},
    "react":            {"title": "React – The Complete Guide",        "platform": "Udemy",    "url": "https://udemy.com/course/react-the-complete-guide-incl-redux/"},
    "docker":           {"title": "Docker & Kubernetes Complete",      "platform": "Udemy",    "url": "https://udemy.com/course/docker-and-kubernetes-the-complete-guide/"},
    "aws":              {"title": "AWS Cloud Practitioner",            "platform": "AWS",      "url": "https://aws.amazon.com/certification/certified-cloud-practitioner/"},
    "typescript":       {"title": "Understanding TypeScript",          "platform": "Udemy",    "url": "https://udemy.com/course/understanding-typescript/"},
    "data analysis":    {"title": "Data Analyst with Python",         "platform": "DataCamp", "url": "https://datacamp.com/tracks/data-analyst-with-python"},
    "fastapi":          {"title": "FastAPI – Full Course",             "platform": "freeCodeCamp", "url": "https://youtube.com/watch?v=0sOvCWFmrtA"},
    "django":           {"title": "Django for Beginners",              "platform": "freeCodeCamp", "url": "https://youtube.com/watch?v=F5mRW0jo-U4"},
    "git":              {"title": "Git & GitHub Bootcamp",             "platform": "Udemy",    "url": "https://udemy.com/course/git-and-github-bootcamp/"},
    "communication":    {"title": "Improving Communication Skills",    "platform": "Coursera", "url": "https://coursera.org/learn/wharton-communication-skills"},
}

def suggest_courses(gaps: list[str]) -> list[dict]:
    seen, courses = set(), []
    for gap in gaps[:6]:
        key = gap.lower()
        for keyword, course in COURSE_MAP.items():
            if keyword in key and course["url"] not in seen:
                seen.add(course["url"])
                courses.append(course)
                break
    return courses


# ---------------------------------------------------------------------------
# GET /skills/trending
# ---------------------------------------------------------------------------

@router.get("/trending")
async def get_trending_skills(
    role: str = Query(default="software engineer"),
    db: Session = Depends(get_db),
):
    from .service import normalize_role_for_esco
    normalized_role = normalize_role_for_esco(role)
    
    print(f"Original: {role} → Normalized: {normalized_role}")  # debug
    esco_skills = await fetch_esco_skills_for_occupation(normalized_role)
    print(f"ESCO skills returned: {[s['skill'] for s in esco_skills[:5]]}")

    # Don't filter DB by role — too few jobs, just get all skill frequencies
    db_frequencies = get_skill_frequencies_from_db(db, days_back=90, role_filter=None)
    
    trending = rank_trending_skills(db_frequencies, esco_skills, top_n=20)

    return {
        "role": role,
        "skills": trending,
        "meta": {
            "esco_skills_found": len(esco_skills),
            "db_postings_analyzed": sum(db_frequencies.values()),
        },
    }
# ---------------------------------------------------------------------------
# GET /skills/gaps   (JWT protected — uses logged-in user's profile)
# ---------------------------------------------------------------------------

@router.get("/gaps")
async def get_skill_gaps(
    target_role_override: str = Query(default=None),  # ← add this
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_user_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    user_skills: list[str] = profile.skills or []

    # Use override if provided, otherwise infer from profile
    from .service import infer_target_role
    target_role = target_role_override or infer_target_role(profile)
    print(f"GAP ANALYSIS → target_role: {target_role}")  # ← add this

    esco_skills = await fetch_esco_skills_for_occupation(target_role)
    print(f"GAP ESCO skills: {[s['skill'] for s in esco_skills[:5]]}")  # ← and this

    db_frequencies = get_skill_frequencies_from_db(db, days_back=90, role_filter=target_role)
    trending = rank_trending_skills(db_frequencies, esco_skills, top_n=20)
    gap_data = compute_skill_gaps(user_skills, trending)

    return {
        "target_role": target_role,
        "current_skills": user_skills,
        **gap_data,
    }

# ---------------------------------------------------------------------------
# POST /skills/recommend   (JWT protected)
# ---------------------------------------------------------------------------

@router.post("/recommend")
async def get_recommendations(
    payload: RecommendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_user_profile(db, current_user.id)
    user_skills = profile.skills if profile else []
    personal = (profile.personal_info or {}) if profile else {}
    target_role = payload.target_role or personal.get("desired_role") or "software engineer"

    roadmap = generate_recommendations_groq(
        user_skills=user_skills,
        skill_gaps=payload.skill_gaps,
        target_role=target_role,
    )
    courses = suggest_courses(payload.skill_gaps)

    return {
        "roadmap": roadmap,
        "suggested_courses": courses,
        "target_role": target_role,
    }