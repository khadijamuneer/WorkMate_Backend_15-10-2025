from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from jobs.matcher import match_jobs
from jobs.scraper import scrape_jobs
from database import get_db
from crud import get_user_by_email
from models import JobScraped

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# -----------------------------
# MATCH JOBS (PIPELINE ENTRY)
# -----------------------------
@router.get("/match")
def get_matched_jobs(
    email: str = Query(...),
    top_k: int = Query(10),
    db: Session = Depends(get_db)
):
    # ---- USER
    user_profile = get_user_by_email(db, email)
    if not user_profile:
        raise HTTPException(status_code=404, detail="User not found")

    # ---- JOBS FROM DB (NOT SCRAPING EVERY TIME)
    jobs_db = db.query(JobScraped).all()

    # ---- SCRAPE ONLY IF DB EMPTY
    if not jobs_db:
        scraped = scrape_jobs("software engineer")
        if not scraped:
            raise HTTPException(status_code=404, detail="No jobs available")

        for job in scraped:
            db.add(JobScraped(**job))
        db.commit()

        jobs_db = db.query(JobScraped).all()

    # ---- MATCH
    matched = match_jobs(
        user_profile.__dict__,
        [job.__dict__ for job in jobs_db],
        top_k=top_k
    )

    return {
        "count": len(matched),
        "jobs": matched
    }


# -----------------------------
# SEARCH (SCRAPE ON DEMAND)
# -----------------------------
@router.get("/search")
def search_jobs(
    query: str = Query(...),
    db: Session = Depends(get_db)
):
    jobs = scrape_jobs(query)
    if not jobs:
        raise HTTPException(status_code=404, detail="No jobs found")

    return {
        "count": len(jobs),
        "jobs": jobs
    }
