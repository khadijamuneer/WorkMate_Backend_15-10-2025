"""
skills/service.py
-----------------
Aggregates skill data from your jobs_scraped table + ESCO API,
ranks trending skills, computes user gaps, and calls Groq (llama-3.1-8b-instant)
for personalized recommendations.
"""

import json
import httpx
from collections import Counter
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from groq import Groq
import os

from models import JobScraped, Profile

GROQ_CLIENT = Groq(api_key=os.environ.get("GROQ_API_KEY_SKILLS"))
ESCO_BASE = "https://ec.europa.eu/esco/api"


# ---------------------------------------------------------------------------
# ESCO skill taxonomy (free, no API key)
# ---------------------------------------------------------------------------

def get_user_profile(db: Session, user_id: int):
    return db.query(Profile).filter(Profile.user_id == user_id).first()


async def is_esco_match_relevant(requested: str, esco_result: str) -> bool:
    """Ask Groq whether the ESCO-matched occupation is relevant to what was requested."""
    try:
        response = GROQ_CLIENT.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "user",
                    "content": f"Is '{esco_result}' a relevant occupation match for someone who searched '{requested}'? Reply only YES or NO."
                }
            ],
            max_tokens=5,
            temperature=0.0,
        )
        answer = response.choices[0].message.content.strip().upper()
        return answer.startswith("YES")
    except Exception:
        return True  # assume relevant if Groq fails


async def fetch_skills_from_groq(occupation_title: str) -> list[dict]:
    """When ESCO fails or returns irrelevant results, ask Groq for real-world skills."""
    try:
        response = GROQ_CLIENT.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a job market expert. Return ONLY a JSON array of the 15 most important skills for the given job title. Each item must be: {\"skill\": \"skill name\", \"importance\": 0.9}. No explanation, no markdown, no backticks. Just the JSON array."
                },
                {
                    "role": "user",
                    "content": occupation_title
                }
            ],
            max_tokens=400,
            temperature=0.2,
        )
        raw = response.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
        skills = json.loads(raw)
        return [{"skill": s["skill"].lower(), "importance": s.get("importance", 0.9)} for s in skills]
    except Exception as e:
        print(f"fetch_skills_from_groq failed: {e}")
        return []


async def fetch_esco_skills_for_occupation(occupation_title: str) -> list[dict]:
    """
    Queries ESCO REST API to get essential + optional skills for a job title.
    Validates the ESCO match using Groq — if irrelevant, falls back to Groq-generated skills.
    """
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            search = await client.get(
                f"{ESCO_BASE}/search",
                params={"text": occupation_title, "type": "occupation", "language": "en", "limit": 1},
            )
            results = search.json().get("_embedded", {}).get("results", [])
            if not results:
                print(f"ESCO: no results for '{occupation_title}' — using Groq")
                return await fetch_skills_from_groq(occupation_title)

            esco_matched_title = results[0].get("title", "")
            print(f"ESCO matched '{occupation_title}' → '{esco_matched_title}'")

            # Ask Groq if this ESCO match actually makes sense
            is_relevant = await is_esco_match_relevant(occupation_title, esco_matched_title)
            if not is_relevant:
                print(f"ESCO match irrelevant — using Groq instead")
                return await fetch_skills_from_groq(occupation_title)

            occ_uri = results[0]["uri"]
            detail = await client.get(f"{ESCO_BASE}/resource/occupation", params={"uri": occ_uri, "language": "en"})
            data = detail.json()

            essential = [
                {"skill": s["title"].lower(), "importance": 1.0}
                for s in data.get("_links", {}).get("hasEssentialSkill", [])
            ]
            optional = [
                {"skill": s["title"].lower(), "importance": 0.55}
                for s in data.get("_links", {}).get("hasOptionalSkill", [])
            ]
            return essential + optional

    except Exception as e:
        print(f"fetch_esco_skills_for_occupation failed: {e} — using Groq")
        return await fetch_skills_from_groq(occupation_title)


# ---------------------------------------------------------------------------
# Skill frequency from your jobs_scraped table
# ---------------------------------------------------------------------------

def get_skill_frequencies_from_db(
    db: Session,
    days_back: int = 90,
    role_filter: Optional[str] = None,
) -> dict[str, int]:
    since = datetime.utcnow().date() - timedelta(days=days_back)
    since_str = since.strftime("%Y-%m-%d")
    query = db.query(JobScraped).filter(JobScraped.date_posted >= since_str)

    if role_filter:
        query = query.filter(JobScraped.title.ilike(f"%{role_filter}%"))

    counter: Counter = Counter()
    for job in query.all():
        skills_raw = job.extracted_skills or job.skills or []
        if isinstance(skills_raw, str):
            try:
                skills_raw = json.loads(skills_raw)
            except Exception:
                skills_raw = []
        counter.update(s.strip().lower() for s in skills_raw if s)

    return dict(counter)


# ---------------------------------------------------------------------------
# Trend ranking — merges ESCO + DB frequencies
# ---------------------------------------------------------------------------

def rank_trending_skills(
    db_frequencies: dict[str, int],
    esco_skills: list[dict],
    top_n: int = 20,
) -> list[dict]:
    esco_map = {s["skill"]: s["importance"] for s in esco_skills}
    all_skills = set(db_frequencies.keys()) | set(esco_map.keys())

    scored = []
    for skill in all_skills:
        if not skill or len(skill) < 2:
            continue
        freq = db_frequencies.get(skill, 0)
        importance = esco_map.get(skill, 0.25)
        raw = (freq * 0.6) + (importance * 0.4 * 100)
        scored.append({"skill": skill.title(), "frequency": freq, "raw": raw})

    scored.sort(key=lambda x: x["raw"], reverse=True)
    max_raw = scored[0]["raw"] if scored else 1

    result = []
    for item in scored[:top_n]:
        score = round((item["raw"] / max_raw) * 100, 1)
        if score >= 75:
            momentum = "hot"
        elif score >= 45:
            momentum = "rising"
        else:
            momentum = "stable"
        result.append({
            "skill": item["skill"],
            "frequency": item["frequency"],
            "score": score,
            "momentum": momentum,
        })
    return result


# ---------------------------------------------------------------------------
# Skill gap analysis
# ---------------------------------------------------------------------------

def compute_skill_gaps(
    user_skills: list[str],
    trending_skills: list[dict],
) -> dict:
    if not user_skills:
        return {
            "matched": [],
            "gaps": trending_skills[:10],
            "strength_score": 0.0,
            "total_trending": len(trending_skills),
        }

    trending_names = [s["skill"] for s in trending_skills]

    prompt = f"""You are a skill matching engine. Given a candidate's skills and a list of job market skills, identify which job market skills the candidate already has based on semantic meaning.

Candidate skills: {user_skills}

Job market skills: {trending_names}

Return ONLY a JSON object with two keys:
{{"matched": ["skill1", "skill2"], "gaps": ["skill3", "skill4"]}}

- "matched" = job market skills the candidate already covers (e.g. "Python" covers "python programming", "data analysis" covers "perform data cleansing")
- "gaps" = job market skills the candidate does NOT have
- Every skill from the job market list must appear in either matched or gaps
- Return only the JSON object, nothing else"""

    try:
        response = GROQ_CLIENT.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a JSON API. Respond with ONLY a valid JSON object. No explanation, no markdown, no backticks."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=500,
            temperature=0.1,
        )
        raw = response.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)

        matched_names = {s.lower() for s in result.get("matched", [])}
        gaps_names = {s.lower() for s in result.get("gaps", [])}

        matched = [{**s, "status": "have"} for s in trending_skills if s["skill"].lower() in matched_names]
        gaps = [{**s, "status": "missing"} for s in trending_skills if s["skill"].lower() in gaps_names]

    except Exception as e:
        print(f"Groq matching failed: {e} — falling back to substring match")
        user_set = {s.strip().lower() for s in user_skills}
        matched, gaps = [], []
        for item in trending_skills:
            tl = item["skill"].lower()
            if any(us in tl or tl in us for us in user_set if len(us) > 2):
                matched.append({**item, "status": "have"})
            else:
                gaps.append({**item, "status": "missing"})

    total_weight = sum(s["score"] for s in trending_skills) or 1
    matched_weight = sum(s["score"] for s in matched)
    strength_score = round((matched_weight / total_weight) * 100, 1)

    return {
        "matched": matched,
        "gaps": gaps[:10],
        "strength_score": strength_score,
        "total_trending": len(trending_skills),
    }


# ---------------------------------------------------------------------------
# Groq — personalized recommendation
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a concise career advisor. Given a candidate's current skills and their top skill gaps for a target role, produce:

1. **Priority skills to learn** (top 3–4, with a one-line reason each)
2. **Realistic timeline** (short paragraph)
3. **Quick wins** (2–3 things they can do this week)

Be specific, practical, and encouraging. Use markdown. Keep total response under 350 words."""


def generate_recommendations_groq(
    user_skills: list[str],
    skill_gaps: list[str],
    target_role: str,
) -> str:
    user_msg = f"""
Candidate:
- Current skills: {", ".join(user_skills) if user_skills else "Not specified"}
- Target role: {target_role}
- Top market skill gaps: {", ".join(skill_gaps[:8])}

Generate a focused career development roadmap.
""".strip()

    response = GROQ_CLIENT.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=600,
        temperature=0.65,
    )
    return response.choices[0].message.content


def normalize_role_for_esco(raw_title: str) -> str:
    """
    Uses Groq to normalize a raw job title into a standard ESCO-friendly occupation name.
    """
    try:
        response = GROQ_CLIENT.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a job title normalizer. Given a raw job title, return ONLY the closest standard occupation name that would exist in a professional taxonomy like ESCO or O*NET. Return just the occupation name, nothing else. Examples: 'Data Science Intern' -> 'data scientist', 'Frontend Dev' -> 'web developer', 'ML Engineer II' -> 'machine learning engineer'."
                },
                {
                    "role": "user",
                    "content": raw_title
                }
            ],
            max_tokens=20,
            temperature=0.1,
        )
        return response.choices[0].message.content.strip().lower()
    except Exception:
        return raw_title


def infer_target_role(profile: Profile) -> str:
    print(f"infer_target_role → experience: {profile.experience}")
    print(f"infer_target_role → education: {profile.education}")

    experience = profile.experience or []
    if isinstance(experience, list) and experience:
        latest = experience[0]
        title = latest.get("title") or latest.get("role") or latest.get("position")
        if title:
            print(f"infer_target_role → picked title: {title}")
            return normalize_role_for_esco(title.strip())

    education = profile.education or []
    if isinstance(education, list) and education:
        degree = education[0].get("degree", "")
        if "computer" in degree.lower() or "software" in degree.lower():
            return "software developer"
        if "data" in degree.lower():
            return "data analyst"
        if "business" in degree.lower() or "mba" in degree.lower():
            return "business analyst"

    return "software developer"