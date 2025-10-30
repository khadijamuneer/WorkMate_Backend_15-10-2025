from fastapi import APIRouter, Query
from .scraper import scrape_jobs
from models import JobScraped
from database import SessionLocal
from sqlalchemy.orm import Session
from datetime import date


from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import JobScraped, Profile
from .matcher import match_jobs
from urllib.parse import unquote



router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("/search")
def search_jobs(query: str = Query(..., description="Job title or keywords")):
    db: Session = SessionLocal()
    try:
        # Decode query (e.g., "Mobile%20App%20Developer" → "Mobile App Developer")
        query = unquote(query)


        jobs = scrape_jobs(query)

        if not jobs:
            return {"count": 0, "jobs": []}

        for job in jobs:
            db_job = JobScraped(
                title=job.get("title"),
                company=job.get("company"),
                location=job.get("location"),
                link=job.get("link"),
                preview_desc=job.get("preview_desc"),
                full_desc=job.get("full_desc"),
                date_posted=job.get("date_posted"),
                skills=job.get("skills") if isinstance(job.get("skills"), list) else [job.get("skills")],
                date_scraped=date.today()
            )
            db.add(db_job)

        db.commit()

        # Ensure skills is always a list when sending to frontend
        jobs_for_frontend = []
        for job in jobs:
            job_copy = job.copy()
            if not isinstance(job_copy.get("skills"), list):
                job_copy["skills"] = [job_copy["skills"]]
            jobs_for_frontend.append(job_copy)

        return {"count": len(jobs_for_frontend), "jobs": jobs_for_frontend}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}

    finally:
        db.close()




@router.get("/match")
def get_matched_jobs(email: str = Query(..., description="User email"), db: Session = Depends(get_db)):
    # Fetch user profile
    profile = db.query(Profile).filter(Profile.user_email == email).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Fetch all scraped jobs
    jobs_orm = db.query(JobScraped).all()
    if not jobs_orm:
        return {"count": 0, "jobs": []}

    # Convert ORM objects to dicts for matcher
    jobs = []
    for job in jobs_orm:
        jobs.append({
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "link": job.link,
            "preview_desc": job.preview_desc,
            "description": job.full_desc or job.preview_desc or "",
            "skills": job.skills or [],
            "date_posted": job.date_posted
        })


    user_data = {
        "skills": profile.skills or [],
        "projects": profile.projects or []
    }

    matched = match_jobs(user_data, jobs)
    return {"count": len(matched), "jobs": matched}
