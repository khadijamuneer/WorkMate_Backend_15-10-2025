
import sys
sys.path.append(".")

from database import SessionLocal
from models import JobScraped
from jobs.matcher import precompute_job

db = SessionLocal()
print("Connecting to database and fetching jobs...")

# Use .is_(None) instead of == None
jobs = db.query(JobScraped).filter(JobScraped.embedding.is_(None)).all()
print(f"Found {len(jobs)} jobs missing embeddings.")

if len(jobs) > 0:
    print(f"Starting backfill for {len(jobs)} jobs...")

for i, job in enumerate(jobs):
    try:
        precompute_job(job, db)
        if i % 10 == 0:  # Print every 10 jobs so you see it working faster
            print(f"  Processed {i}/{len(jobs)}")
    except Exception as e:
        print(f"❌ Error on job ID {job.id}: {e}")

db.close()
print("Done!")