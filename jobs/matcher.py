
# jobs/matcher.py
from huggingface_hub import snapshot_download
import spacy
import re

# --- Load model for extracting skills ---
model_path = snapshot_download("amjad-awad/skill-extractor", repo_type="model")
nlp = spacy.load(model_path)

def extract_skills(text):
    doc = nlp(text)
    return list({ent.text.lower() for ent in doc.ents if "SKILLS" in ent.label_})

def infer_experience_level(text):
    exp_levels = {
        "intern": 0.2,
        "junior": 0.5,
        "associate": 0.6,
        "mid": 0.7,
        "senior": 0.9,
        "lead": 1.0
    }
    text = text.lower()
    for keyword, value in exp_levels.items():
        if re.search(rf"\b{keyword}\b", text):
            return value
    return 0.7  # assume mid if unspecified

def clean_skill(skill):
    """
    Normalize skills: lowercase, strip spaces and quotes
    """
    return skill.strip().strip('"').lower()


def match_jobs(user, jobs):
    user_skills = set(skill.lower() for skill in user.get("skills", []))
    user_projects_text = " ".join(
        " ".join(p.get("desc", [])) if isinstance(p, dict) else str(p)
        for p in user.get("projects", [])
    )
    user_extracted = set(extract_skills(user_projects_text))
    user_exp = infer_experience_level(user_projects_text)

    matched_jobs = []

    for job in jobs:
        job_skills = set(skill.lower() for skill in (job.get("skills") or []))
        job_extracted = set(extract_skills(job.get("description") or ""))
        job_exp = infer_experience_level(job.get("description") or "")

        explicit_skill_match = (
            len(user_skills & job_skills) / len(job_skills) if job_skills else 0
        )

        extracted_skill_match = (
            len(user_extracted & job_extracted) / len(job_extracted)
            if job_extracted
            else 0
        )

        exp_match = 1 - abs(user_exp - job_exp)

        final_score = (
            0.7 * explicit_skill_match
            + 0.2 * extracted_skill_match
            + 0.1 * exp_match
        )

        # --- DEBUG LOG ---
        print("JOB:", job.get("title"))
        print("Job Skills:", job_skills)
        print("User Skills:", user_skills)
        print("Explicit Match:", explicit_skill_match)
        print("Extracted Match:", extracted_skill_match)
        print("Experience Match:", exp_match)
        print("Final Score:", round(final_score, 3))
        print("-" * 50)

        matched_jobs.append({
            "id": job.get("id"),
            "title": job.get("title"),
            "company": job.get("company"),
            "location": job.get("location"),
            "link": job.get("link"),
            "preview_desc": job.get("preview_desc"),
            "full_desc": job.get("description"),
            "skills": job.get("skills") or [],
            "date_posted": job.get("date_posted"),
            "score": round(final_score, 3)
        })

    matched_jobs.sort(key=lambda x: x["score"], reverse=True)
    return matched_jobs