# jobs/matcher.py

from huggingface_hub import snapshot_download
from sentence_transformers import SentenceTransformer
import spacy, re, os
import numpy as np
import faiss
from dotenv import load_dotenv
import groq

# -----------------------------
# ENV
# -----------------------------
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = groq.Client(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# -----------------------------
# Skill extractor (YOUR MODEL)
# -----------------------------
model_path = snapshot_download("amjad-awad/skill-extractor", repo_type="model")
nlp = spacy.load(model_path)

def extract_skills(text: str):
    if not text:
        return []
    doc = nlp(text)
    return list({ent.text.lower() for ent in doc.ents if "SKILL" in ent.label_.upper()})

def infer_experience_level(text: str):
    levels = {
        "intern": 0.2,
        "junior": 0.5,
        "associate": 0.6,
        "mid": 0.7,
        "senior": 0.9,
        "lead": 1.0
    }
    text = (text or "").lower()
    for k, v in levels.items():
        if re.search(rf"\b{k}\b", text):
            return v
    return 0.7

# -----------------------------
# Embedding Model
# -----------------------------
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# -----------------------------
# FAISS
# -----------------------------
def build_faiss_index(vectors: np.ndarray):
    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)
    faiss.normalize_L2(vectors)
    index.add(vectors)
    return index

# -----------------------------
# MAIN MATCHER
# -----------------------------
def match_jobs(user: dict, jobs: list, top_k: int = 10):

    # -------- USER TEXT (SAFE)
    projects_text = []
    for p in user.get("projects", []):
        if isinstance(p, dict):
            desc = p.get("desc", "")
            if isinstance(desc, list):
                projects_text.extend(map(str, desc))
            else:
                projects_text.append(str(desc))
        else:
            projects_text.append(str(p))

    user_text = (
        "Skills: " + ", ".join(map(str, user.get("skills", []))) +
        ". Projects: " + " ".join(projects_text)
    )

    user_skills = set(extract_skills(user_text))
    user_exp = infer_experience_level(user_text)

    # -------- TECH-ONLY FILTER (NO HARDCODE)
    tech_jobs = []
    for j in jobs:
        job_text = f"{j.get('title','')} {j.get('full_desc','')}"
        skills = extract_skills(job_text)

        if len(skills) >= 2:   # 🔥 SKILL-BASED FILTER
            j["extracted_skills"] = skills
            tech_jobs.append(j)

    if not tech_jobs:
        return []

    # -------- EMBEDDINGS
    job_texts = [
        f"{j.get('title','')} {j.get('full_desc','')} Skills: {', '.join(j.get('skills', []))}"
        for j in tech_jobs
    ]

    job_vecs = embedder.encode(
        job_texts,
        normalize_embeddings=True
    ).astype("float32")

    user_vec = embedder.encode(
        [user_text],
        normalize_embeddings=True
    ).astype("float32")

    # -------- FAISS SEARCH
    index = build_faiss_index(job_vecs)
    scores, indices = index.search(user_vec, min(20, len(tech_jobs)))

    candidates = []
    for rank, idx in enumerate(indices[0]):
        job = tech_jobs[idx]
        job_desc = job.get("full_desc", "")
        job_skills = set(extract_skills(job_desc))
        job_exp = infer_experience_level(job_desc)

        skill_score = (
            len(user_skills & job_skills) / len(job_skills)
            if job_skills else 0
        )

        exp_score = 1 - abs(user_exp - job_exp)

        final_score = (
            0.6 * float(scores[0][rank]) +
            0.25 * skill_score +
            0.15 * exp_score
        )

        candidates.append({
            **job,
            "score": round(final_score, 3),
            "match_percentage": int(final_score * 100),
            "cosine_similarity": round(float(scores[0][rank]), 3)
        })

    # -------- GROQ RERANK (OPTIONAL, SAFE)
    if client:
        try:
            docs = [
                {"text": f"{c['title']} {c.get('full_desc','')}", "metadata": {"i": i}}
                for i, c in enumerate(candidates)
            ]

            res = client.rerank(
                query=user_text,
                documents=docs,
                top_k=top_k
            )

            return [candidates[r["document"]["metadata"]["i"]] for r in res["results"]]

        except Exception as e:
            print("Groq rerank failed, fallback:", e)

    return sorted(candidates, key=lambda x: x["score"], reverse=True)[:top_k]
