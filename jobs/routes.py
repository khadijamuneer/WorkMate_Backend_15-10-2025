
from fastapi import APIRouter, Query
from .scraper import scrape_jobs
from models import JobScraped
from database import SessionLocal
from sqlalchemy.orm import Session
from datetime import date

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("/search")
def search_jobs(query: str = Query(..., description="Job title or keywords")):
    db: Session = SessionLocal()
    try:
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