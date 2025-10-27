# jobs/routes.py
from fastapi import APIRouter, Query, Depends, HTTPException
from .scraper import scrape_jobs
from models import JobScraped, Profile
from database import SessionLocal, get_db
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import date, datetime, timedelta
from .matcher import match_jobs
import re

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def parse_date(date_str: str):
    """Convert various date formats into a proper date object."""
    if not date_str:
        return date.today()

    s = str(date_str).strip().lower()

    # Handle "x days ago" or "30+ days ago"
    m = re.match(r"(\d+)\+?\s*days?\s*ago", s)
    if m:
        days_ago = int(m.group(1))
        return date.today() - timedelta(days=days_ago)

    # today / just posted
    if "today" in s or "just" in s:
        return date.today()

    # yesterday
    if "yesterday" in s:
        return date.today() - timedelta(days=1)

    # Try common formats: "October 25, 2025", "Oct 25, 2025", "2025-10-25"
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            continue

    # fallback
    return date.today()


@router.get("/search")
def search_jobs(query: str = Query(..., description="Job title or keywords")):
    """
    Scrape jobs, normalize date_posted, save to DB,
    return jobs sorted by newest first.
    """
    db: Session = SessionLocal()
    try:
        jobs = scrape_jobs(query)

        if not jobs:
            return {"count": 0, "jobs": []}

        processed_jobs = []

        for job in jobs:
            parsed_date = parse_date(job.get("date_posted"))

            db_job = JobScraped(
                title=job.get("title"),
                company=job.get("company"),
                location=job.get("location"),
                link=job.get("link"),
                preview_desc=job.get("preview_desc"),
                full_desc=job.get("full_desc"),
                date_posted=parsed_date,
                skills=job.get("skills") if isinstance(job.get("skills"), list)
                else ([job.get("skills")] if job.get("skills") else []),
                date_scraped=date.today(),
            )
            db.add(db_job)

            # prepare job for frontend
            job_copy = job.copy()
            job_copy["date_posted"] = parsed_date.isoformat()
            if not isinstance(job_copy.get("skills"), list):
                job_copy["skills"] = [job_copy["skills"]] if job_copy.get("skills") else []
            processed_jobs.append(job_copy)

        db.commit()

        # sort by most recent
        processed_jobs.sort(
            key=lambda j: datetime.strptime(j["date_posted"], "%Y-%m-%d"),
            reverse=True
        )

        return {"count": len(processed_jobs), "jobs": processed_jobs}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}

    finally:
        db.close()


@router.get("/match")
def get_matched_jobs(
    email: str = Query(..., description="User email"),
    sort_by: str = Query("best_match", description="Sort by 'best_match' or 'date'"),
    db: Session = Depends(get_db)
):
    """
    Fetch matched jobs for a user.
    If sort_by == 'date' -> order by JobScraped.date_posted DESC (newest first).
    """
    profile = db.query(Profile).filter(Profile.user_email == email).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Sort by date (newest first)
    if sort_by == "date":
        jobs_orm = db.query(JobScraped).order_by(desc(JobScraped.date_posted)).all()
    else:
        jobs_orm = db.query(JobScraped).all()

    if not jobs_orm:
        return {"count": 0, "jobs": []}

    jobs = []
    for job in jobs_orm:
        # convert to ISO string safely
        try:
            if isinstance(job.date_posted, str):
                # old entries stored as string
                parsed_date = parse_date(job.date_posted)
                job.date_posted = parsed_date
            iso_date = job.date_posted.isoformat()
        except Exception:
            iso_date = date.today().isoformat()

        jobs.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "link": job.link,
            "preview_desc": job.preview_desc,
            "description": job.full_desc or job.preview_desc or "",
            "skills": job.skills or [],
            "date_posted": iso_date,
        })

    # for "best_match" mode → run matcher
    if sort_by == "best_match":
        user_data = {
            "skills": profile.skills or [],
            "projects": profile.projects or []
        }
        matched = match_jobs(user_data, jobs)
        matched.sort(key=lambda x: x.get("score", 0), reverse=True)
        return {"count": len(matched), "jobs": matched}

    # for "date" mode → just newest first
    jobs.sort(
        key=lambda j: datetime.strptime(j["date_posted"], "%Y-%m-%d"),
        reverse=True
    )
    return {"count": len(jobs), "jobs": jobs}
