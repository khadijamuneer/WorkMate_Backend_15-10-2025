from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from groq import Groq
import json
import language_tool_python
from database import get_db
from models import Profile, InterviewResult
from auth import get_current_user
from models import User
from dotenv import load_dotenv
import os

router = APIRouter()

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY_TEXTINTERVIEW")

if not GROQ_API_KEY:
    raise ValueError("Missing GROQ_API_KEY_TEXTINTERVIEW")

client     = Groq(api_key=GROQ_API_KEY)
GROQ_MODEL = "llama-3.1-8b-instant"

# Using LanguageTool's public remote API — no Java install needed.
# Sends text to api.languagetool.org over HTTPS. Free tier allows
# up to 20 requests/min which is plenty for interview use.
print("Initialising LanguageTool (remote)…")
_lang_tool = language_tool_python.LanguageTool("en-US")
print("LanguageTool ready.")


# ── Schemas ────────────────────────────────────────────────────────────────────

class InterviewRequest(BaseModel):
    email: str
    job_title: str
    job_description: str
    job_skills: list[str] = []
    n_questions: int = 5


class InterviewResponse(BaseModel):
    questions: list[str]


class AnswerEvalRequest(BaseModel):
    question: str
    answer: str
    job_title: str = "Software Engineer"
    job_description: str = ""


class AnswerEvalResponse(BaseModel):
    score: int             # 0-100 overall weighted
    relevancy: int         # 0-100  (LLM)
    grammar: int           # 0-100  (LanguageTool)
    tone: int              # 0-100  (LLM)
    relevancy_feedback: str
    grammar_feedback: str  # generated from LanguageTool errors
    tone_feedback: str
    brief_feedback: str
    strengths: list[str]
    improvements: list[str]


class SubmitInterviewRequest(BaseModel):
    email: str
    job_title: str
    job_description: str
    job_skills: list[str] = []
    questions: list[str]
    qa_pairs: list[dict]   # each: {question, answer, eval}


# ── Grammar scoring via LanguageTool ──────────────────────────────────────────

def _score_grammar(text: str) -> tuple[int, str, list[str]]:
    """
    Returns (score 0-100, summary_feedback, list_of_error_messages).

    Scoring logic:
      - Count errors, normalise by word count so short answers aren't unfairly punished.
      - error_rate = errors / words
      - score = max(0, 100 - round(error_rate * 300))
        (i.e. ~1 error per 3 words → score 0; 0 errors → 100)

    We also filter out a few noisy rule categories that fire on informal
    writing and would feel unfair in an interview context (e.g. WHITESPACE_RULE,
    UPPERCASE_SENTENCE_START on proper nouns).
    """
    IGNORED_RULE_IDS = {
        "WHITESPACE_RULE",
        "COMMA_PARENTHESIS_WHITESPACE",
        "EN_UNPAIRED_BRACKETS",
        "UNLIKELY_OPENING_PUNCTUATION",
    }

    matches = _lang_tool.check(text)

    # Filter out noisy rules
    matches = [m for m in matches if m.rule_id not in IGNORED_RULE_IDS]

    words      = len(text.split())
    n_errors   = len(matches)
    error_rate = n_errors / max(words, 1)
    score      = max(0, round(100 - error_rate * 300))
    score      = min(score, 100)

    # Build human-readable feedback
    if n_errors == 0:
        feedback = "No grammatical issues detected — well written."
        error_msgs = []
    else:
        # Deduplicate by message text so we don't repeat the same error
        seen, unique = set(), []
        for m in matches:
            key = m.message
            if key not in seen:
                seen.add(key)
                unique.append(m)

        # Show up to 3 distinct issues
        snippets   = [f'"{m.context.strip()}" — {m.message}' for m in unique[:3]]
        error_msgs = snippets
        feedback   = (
            f"Found {n_errors} issue{'s' if n_errors > 1 else ''}: "
            + "; ".join(snippets[:2])
            + ("." if len(snippets) <= 2 else ", and more.")
        )

    return score, feedback, error_msgs


# ── Tone + Relevancy via LLM (two axes, one call) ─────────────────────────────

def _score_tone_and_relevancy(
    question: str,
    answer: str,
    job_title: str,
    job_description: str,
) -> dict:
    """
    Single Groq call that returns tone + relevancy scores and feedback,
    plus overall brief_feedback, strengths, and improvements.
    Grammar is intentionally excluded — handled by LanguageTool above.
    """
    prompt = f"""You are an expert interview coach evaluating a written interview answer.

Role: {job_title}
Job Context: {job_description[:300] if job_description else 'N/A'}

Question: {question}

Candidate's Answer: {answer}

Evaluate on TWO axes only (0-100 each):

1. RELEVANCY — Does the answer directly and specifically address the question?
   Does it relate to the job role and use appropriate domain knowledge?

2. TONE — Is the tone professional, confident, and appropriate for a formal
   interview? Penalise overly casual language, hedging, or lack of confidence.

Respond ONLY with a valid JSON object — no markdown, no backticks, no extra text:
{{
  "relevancy": <0-100>,
  "tone": <0-100>,
  "relevancy_feedback": "<1 concise sentence>",
  "tone_feedback": "<1 concise sentence>",
  "brief_feedback": "<2-3 sentence overall summary of the answer quality>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}}"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=500,
        )
        raw  = response.choices[0].message.content.strip()
        raw  = raw[raw.find("{"):raw.rfind("}") + 1]
        data = json.loads(raw)
        return data
    except Exception as e:
        # Graceful fallback
        return {
            "relevancy":          50,
            "tone":               50,
            "relevancy_feedback": "Could not evaluate relevancy.",
            "tone_feedback":      "Could not evaluate tone.",
            "brief_feedback":     f"Evaluation error: {e}",
            "strengths":          [],
            "improvements":       [],
        }


# ── 1. Generate questions ──────────────────────────────────────────────────────

@router.post("/generate", response_model=InterviewResponse)
async def generate_interview_questions(
    request: InterviewRequest,
    db: Session = Depends(get_db),
):
    """Generate personalised interview questions based on user profile + job."""
    profile = db.query(Profile).filter(Profile.user_email == request.email).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found. Please complete your profile first.",
        )

    personal_info  = profile.personal_info if isinstance(profile.personal_info, dict) else {}
    education      = profile.education or []
    experience     = profile.experience or []
    skills         = profile.skills or []

    education_str  = ", ".join([
        f"{edu.get('degree', '')} in {edu.get('field_of_study', '')}"
        for edu in education if edu.get("degree")
    ]) or "N/A"

    experience_str = ", ".join([
        f"{exp.get('title', '')} at {exp.get('company', '')}"
        for exp in experience if exp.get("title")
    ]) or "N/A"

    skills_str     = ", ".join(skills) if skills else "N/A"
    job_skills_str = ", ".join(request.job_skills) if request.job_skills else "N/A"

    prompt = f"""
You are a senior technical interviewer.
Generate {request.n_questions} advanced, technical interview questions for a candidate applying to this job:

Job Info:
Title: {request.job_title}
Description: {request.job_description[:500]}...
Required Skills: {job_skills_str}

Candidate Profile:
Name: {personal_info.get('name', 'N/A')}
Education: {education_str}
Skills: {skills_str}
Experience: {experience_str}

Rules:
- Questions must be strictly relevant to the job requirements.
- Include deep technical concepts, algorithms, architectures, problem-solving, trade-offs.
- Tailor difficulty to candidate's profile and job level.
- Return ONLY the questions, one per line, numbered 1-{request.n_questions}.
- NO introductions, explanations, or extra text.
- Questions should be open-ended and test both technical knowledge and practical application.
"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        text  = response.choices[0].message.content.strip()
        lines = []
        for line in text.split("\n"):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith("-") or line.startswith("•")):
                cleaned = line.lstrip("0123456789.-•) ").strip()
                if cleaned:
                    lines.append(cleaned)

        if not lines:
            lines = [l.strip() for l in text.split("\n") if l.strip()][: request.n_questions]

        if len(lines) < request.n_questions:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate enough questions. Please try again.",
            )

        return InterviewResponse(questions=lines[: request.n_questions])

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating questions: {str(e)}")


# ── 2. Evaluate a single answer ────────────────────────────────────────────────

@router.post("/evaluate", response_model=AnswerEvalResponse)
async def evaluate_answer(request: AnswerEvalRequest):
    """
    Grammar  → LanguageTool (local, no API call)
    Tone     → Groq LLM
    Relevancy→ Groq LLM  (single combined call for both)
    """
    if not request.answer or len(request.answer.strip()) < 10:
        return AnswerEvalResponse(
            score=0, relevancy=0, grammar=0, tone=0,
            relevancy_feedback="No answer provided.",
            grammar_feedback="No answer provided.",
            tone_feedback="No answer provided.",
            brief_feedback="No answer was given for this question.",
            strengths=[],
            improvements=["Provide a substantive answer."],
        )

    # ── Grammar (local) ────────────────────────────────────────────────────────
    grammar_score, grammar_feedback, grammar_errors = _score_grammar(request.answer)

    # ── Tone + Relevancy (one LLM call) ───────────────────────────────────────
    llm = _score_tone_and_relevancy(
        question=request.question,
        answer=request.answer,
        job_title=request.job_title,
        job_description=request.job_description,
    )

    relevancy_score = int(llm.get("relevancy", 50))
    tone_score      = int(llm.get("tone", 50))

    # ── Merge grammar errors into improvements if any ─────────────────────────
    improvements = llm.get("improvements", [])
    if grammar_errors:
        improvements = list(improvements) + [f"Grammar: {e}" for e in grammar_errors[:2]]

    # ── Overall score: relevancy 40%, grammar 30%, tone 30% ───────────────────
    overall = round(relevancy_score * 0.40 + grammar_score * 0.30 + tone_score * 0.30)

    return AnswerEvalResponse(
        score=overall,
        relevancy=relevancy_score,
        grammar=grammar_score,
        tone=tone_score,
        relevancy_feedback=llm.get("relevancy_feedback", ""),
        grammar_feedback=grammar_feedback,
        tone_feedback=llm.get("tone_feedback", ""),
        brief_feedback=llm.get("brief_feedback", ""),
        strengths=llm.get("strengths", []),
        improvements=improvements,
    )


# ── 3. Submit full interview → save to history ─────────────────────────────────

@router.post("/submit")
async def submit_interview(
    request: SubmitInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Saves completed interview results to InterviewResult table
    (same table as video interviews, interview_type = 'text').
    """
    qa_pairs   = request.qa_pairs
    n_answered = sum(1 for qa in qa_pairs if qa.get("answer", "").strip())

    evals         = [qa.get("eval") or {} for qa in qa_pairs if qa.get("answer", "").strip()]
    avg_score     = round(sum(e.get("score", 0)     for e in evals) / max(len(evals), 1), 1)
    avg_relevancy = round(sum(e.get("relevancy", 0) for e in evals) / max(len(evals), 1), 1)
    avg_grammar   = round(sum(e.get("grammar", 0)   for e in evals) / max(len(evals), 1), 1)
    avg_tone      = round(sum(e.get("tone", 0)      for e in evals) / max(len(evals), 1), 1)

    content_scores = []
    for qa in qa_pairs:
        ev       = qa.get("eval") or {}
        answered = bool(qa.get("answer", "").strip())
        content_scores.append({
            "question":       qa.get("question", ""),
            "answer":         qa.get("answer", ""),
            "score":          ev.get("score", 0) if answered else 0,
            "relevance":      ev.get("relevancy", 0),
            "clarity":        ev.get("tone", 0),
            "grammar":        ev.get("grammar",0),
            "depth":          ev.get("tone", 0),
            "structure":      ev.get("score", 0),
            "brief_feedback": ev.get("brief_feedback", "No answer recorded for this question.")
                              if answered else "No answer recorded for this question.",
            "strengths":      ev.get("strengths", []),
            "improvements":   ev.get("improvements", []),
            "missing_keywords": [],
        })

    full_results = {
        "overall_score":      avg_score,
        "content_avg":        avg_score,
        "avg_relevancy":      avg_relevancy,
        "avg_grammar":        avg_grammar,
        "avg_tone":           avg_tone,
        "grammar_score":      avg_grammar,
        "clarity_score":      avg_tone,
        "content_scores":     content_scores,
        "questions_answered": n_answered,
        "interview_type":     "text",
    }

    record = InterviewResult(
        user_id           = current_user.id,
        user_email        = current_user.email,
        job_title         = request.job_title,
        job_company       = "",
        job_location      = "",
        overall_score     = avg_score,
        content_score     = avg_score,
        voice_score       = None,
        eye_contact_score = None,
        posture_score     = None,
        voice_label       = None,
        eye_contact_label = None,
        posture_label     = None,
        total_words       = sum(len(qa.get("answer", "").split()) for qa in qa_pairs),
        words_per_min     = None,
        filler_count      = None,
        filler_rate       = None,
        filler_pct        = None,
        repetitions       = None,
        duration_sec      = None,
        full_results      = full_results,
        questions         = request.questions,
        interview_type    = "text",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {"result_id": record.id, **full_results}


# ── 4. Text interview history ──────────────────────────────────────────────────

@router.get("/history")
def get_text_interview_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = (
        db.query(InterviewResult)
        .filter(
            InterviewResult.user_email == current_user.email,
            InterviewResult.interview_type == "text",
        )
        .order_by(InterviewResult.created_at.desc())
        .all()
    )
    return {
        "count": len(records),
        "results": [
            {
                "id":             r.id,
                "job_title":      r.job_title,
                "overall_score":  float(r.overall_score or 0),
                "content_score":  float(r.content_score or 0),
                "grammar_score": float((r.full_results or {}).get("avg_grammar", 0)), # ADD THIS
                "clarity_score": float((r.full_results or {}).get("avg_tone", 0)),
                "total_words":    r.total_words,
                "interview_type": r.interview_type,
                "created_at":     r.created_at.isoformat() if r.created_at else None,
                "questions":      r.questions or [],
                "full_results":   r.full_results or {},
            }
            for r in records
        ],
    }
