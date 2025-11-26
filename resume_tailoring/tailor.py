# resume_tailoring/tailor.py

from typing import Dict, List
from sentence_transformers import SentenceTransformer, util
from groq import Groq

import re

def get_groq_client(api_key: str):
    """Initialize and return Groq client"""
    return Groq(api_key=api_key)
# -----------------------------
# Load Semantic Model (SBERT)
# -----------------------------
# NOTE: You may change the model to a faster one if needed.
model = SentenceTransformer("all-mpnet-base-v2")


# -----------------------------
# Utility: Clean text
# -----------------------------
def clean(text: str) -> str:
    if not text: return ""
    return re.sub(r"\s+", " ", text.strip())


# -----------------------------
# 1. Extract keywords from JD
# -----------------------------
def extract_job_keywords(job: Dict) -> Dict:
    desc = job.get("full_desc") or job.get("preview_desc") or ""
    skills = job.get("skills") or []

    # Extract tech keywords (very simple version)
    tech_pattern = r"\b(Python|TensorFlow|React|SQL|Machine Learning|NLP|AI|ETL|Linux|Docker|AWS|Keras|PyTorch|Data Analysis|Pandas|NumPy)\b"
    found_tech = re.findall(tech_pattern, desc, flags=re.IGNORECASE)

    # Extract action verbs (research-backed resume optimization)
    verbs_pattern = r"\b(Develop|Build|Design|Optimize|Analyze|Lead|Implement|Deploy|Integrate|Automate|Evaluate|Train|Research)\w*\b"
    found_verbs = re.findall(verbs_pattern, desc, flags=re.IGNORECASE)

    return {
        "skills_required": list(set([s.lower() for s in skills + found_tech])),
        "verbs_required": list(set([v.lower() for v in found_verbs])),
        "raw_text": desc,
    }


# -----------------------------
# 2. Semantic Similarity
# -----------------------------
def semantic_match(user_items: List[str], job_text: str, top_n=3):
    if not user_items:
        return []

    embeddings_items = model.encode(user_items, convert_to_tensor=True)
    embedding_job = model.encode(job_text, convert_to_tensor=True)

    scores = util.cos_sim(embeddings_items, embedding_job)

    # Rank user items by similarity
    ranked = sorted(
        [(user_items[i], float(scores[i][0])) for i in range(len(user_items))],
        key=lambda x: x[1],
        reverse=True,
    )

    return ranked[:top_n]


# -----------------------------
# 3. Rewrite text using LLM
# -----------------------------
# -----------------------------
# 3. Rewrite text using LLM (Safeguarded)
# -----------------------------
def rewrite_bullet(original: str, verbs: List[str], jd_text: str, llm):
    if not original:
        return ""

    example_prompt = f"""
Rewrite the following experience bullet so it aligns with this job description.
ONLY RETURN THE REWRITTEN BULLET. DO NOT add any explanations, comments, labels, or extra text.

Job Description:
"{jd_text}"

Preferred action verbs: {verbs}

Original bullet:
"{original}"
"""

    response = llm.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": example_prompt}],
        temperature=0.2,
    )

    return clean(response.choices[0].message.content)

# -----------------------------
# 4. Tailor Experience
# -----------------------------
def tailor_experience(user_exp: List[Dict], verbs: List[str], jd_text: str, llm):
    tailored_list = []

    for exp in user_exp:
        role = exp.get("role")
        company = exp.get("company")
        bullets = exp.get("bullets", [])

        rewritten_bullets = [
            rewrite_bullet(b, verbs, jd_text, llm) for b in bullets
        ]

        tailored_list.append({
            "role": role,
            "company": company,
            "bullets": rewritten_bullets,
        })

    return tailored_list


# -----------------------------
# 5. Tailor Projects
# -----------------------------
def tailor_projects(projects: List[Dict], verbs: List[str], jd_text: str, llm):
    tailored = []
    for p in projects:
        name = p.get("name")
        bullets = p.get("bullets", [])
        rewritten = [
            rewrite_bullet(b, verbs, jd_text, llm) for b in bullets
        ]

        tailored.append({
            "name": name,
            "bullets": rewritten
        })

    return tailored


# -----------------------------
# 6. Tailored Summary (Safeguarded)
# -----------------------------
def generate_tailored_summary(profile: Dict, job: Dict, llm):
    name = profile.get("name")
    jd_text = job.get("full_desc") or job.get("preview_desc") or ""
    skills = profile.get("skills", [])
    job_title = job.get("title")

    prompt = f"""
Generate a concise 3–4 line professional summary for:
User: {name}
Job Target: {job_title}

Use the user's skills but phrase them according to job description language.
ONLY RETURN THE SUMMARY TEXT. Do NOT invent experiences, skills, or add commentary/explanations.

User Skills: {skills}
Job Description: {jd_text}
"""

    response = llm.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    return clean(response.choices[0].message.content)


# -----------------------------
# 7. Final Tailoring Engine
# -----------------------------
def tailor_resume(profile: Dict, job: Dict, llm):
    """
    Main function used by FastAPI route.
    Normalizes input so keys match what tailoring functions expect.
    """
    jd_keywords = extract_job_keywords(job)
    verbs_required = jd_keywords["verbs_required"]
    jd_text = jd_keywords["raw_text"]

    # 1. Summary
    summary = generate_tailored_summary(profile, job, llm)

    # ---------------------
    # Normalize Experience
    # ---------------------
    user_exp = []
    for w in profile.get("experience", []) or profile.get("work", []):
        user_exp.append({
            "role": w.get("title") or "",
            "company": w.get("company") or "",
            "bullets": w.get("desc") or []
        })

    # ---------------------
    # Normalize Projects
    # ---------------------
    user_proj = []
    for p in profile.get("projects", []):
        user_proj.append({
            "name": p.get("title") or "",
            "bullets": p.get("desc") or []
        })

    # 2. Experience
    tailored_exp = tailor_experience(user_exp, verbs_required, jd_text, llm)

    # 3. Projects
    tailored_projects = tailor_projects(user_proj, verbs_required, jd_text, llm)

    # 4. Skills (sorted by relevance)
    matched_skills = semantic_match(profile.get("skills", []), jd_text, top_n=10)
    skills_sorted = [s[0] for s in matched_skills]

    # Final JSON
    return {
        "job_title": job.get("title"),
        "company": job.get("company"),
        "tailored_summary": summary,
        "tailored_skills": skills_sorted,
        "tailored_experience": tailored_exp,
        "tailored_projects": tailored_projects
    }