from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified          # ← ADD THIS
from database import get_db
from models import Profile, User
from datetime import datetime
import re, json, os, pdfplumber
from docx import Document
from groq import Groq
from dotenv import load_dotenv
from auth import get_current_user

router = APIRouter(prefix="/resume", tags=["Resume"])

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY_RESUME_UPLOAD")
if not GROQ_API_KEY:
    raise ValueError("Missing GROQ_API_KEY_RESUME_UPLOAD")
client = Groq(api_key=GROQ_API_KEY)

PROMPT_SYSTEM = """
You are a precise information-extraction assistant. You will be given raw text extracted from a candidate's resume-like document.
Your job: return **ONLY** a single valid JSON object (no surrounding backticks, no explanation) that exactly matches the keys listed below (same keys must appear in the output). If any field cannot be confidently found, set it to the string "not available" (do not use null). Keep types exactly as in the example:
- personal_info: an object with keys name, email, phone, location, linkedin, github (all strings).
- skills: an array (list) containing exactly one string which is a comma-separated list of skills (if skills absent -> ["not available"]).
- education: an array of objects each with school, degree, years, cgpa (strings).
- work: an array of objects each with title, company, dates, location, desc (desc is an array of strings).
- projects: an array of objects each with title, desc (desc is an array of strings).

Requirements & edge cases:
1. Output STRICTLY the JSON object and nothing else.
2. If the document does not look like a resume (for example: it's a cover letter, invoice, essay, story, report, article, or any general text), you **must not attempt to extract fake resume data.**
   - In that case, still return the same JSON structure but set **every field** (including nested fields) to "not available".
3. Try to extract email and phone using patterns.
4. For dates/years, prefer the format shown in the example, but accept other reasonable formats as strings.
5. For work/education/projects descriptions, put each bullet/line item as a separate string in the desc array.
6. Do not hallucinate. If a specific field cannot be confidently inferred, set it to "not available".
7. Be conservative: do not invent company names, degrees, or years.
8. Maintain the exact JSON keys as in the sample. Do not add extra top-level keys.

Now parse the following DOCUMENT_TEXT provided in the "user" message and return the JSON object exactly as required.
"""

PROMPT_USER_TEMPLATE = "DOCUMENT_TEXT:\n\n'''{text}'''\n\nReturn the JSON now."


def extract_text_from_pdf(path):
    import statistics
    all_text = []
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                try:
                    chars = page.chars
                    if not chars:
                        continue
                    x_positions = [c["x0"] for c in chars]
                    median_x = statistics.median(x_positions)
                    left_side = [x for x in x_positions if x < median_x]
                    right_side = [x for x in x_positions if x >= median_x]
                    is_two_col = abs(len(left_side) - len(right_side)) < 0.4 * len(x_positions)
                    if is_two_col:
                        mid_x = page.width / 2
                        left_text = page.within_bbox((0, 0, mid_x, page.height)).extract_text() or ""
                        right_text = page.within_bbox((mid_x, 0, page.width, page.height)).extract_text() or ""
                        page_text = left_text.strip() + "\n" + right_text.strip()
                    else:
                        page_text = page.extract_text() or ""
                    if page_text.strip():
                        all_text.append(page_text.strip())
                except Exception:
                    continue
    except Exception as e:
        print("PDF extraction error:", e)
    return "\n\n".join(all_text).strip()


def extract_text_from_docx(path):
    try:
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip()).strip()
    except Exception as e:
        print("DOCX extraction error:", e)
        return ""


@router.post("/autofill")
def autofill_profile(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user_email = current_user.email

    if not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    file_location = f"temp_{datetime.now().timestamp()}_{file.filename}"
    with open(file_location, "wb") as f:
        f.write(file.file.read())

    try:
        # Extract text
        if file.filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(file_location)
        else:
            text = extract_text_from_docx(file_location)

        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the document")

        text = re.sub(r'\r\n', '\n', text)
        text = re.sub(r'\n\s+\n', '\n\n', text)

        # Call Groq LLM
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": PROMPT_SYSTEM},
                    {"role": "user", "content": PROMPT_USER_TEMPLATE.format(text=text[:50000])}
                ],
                model="llama-3.1-8b-instant",
                temperature=0.0,
                max_tokens=1500
            )
            raw_output = chat_completion.choices[0].message.content
            parsed = json.loads(raw_output)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error parsing resume: {e}")

        # Always use logged-in user's email
        personal_info_dict = parsed["personal_info"]
        personal_info_dict["email"] = current_user_email

        skills_list = []
        if parsed["skills"] and parsed["skills"][0] != "not available":
            skills_list = [s.strip() for s in parsed["skills"][0].split(",")]

        # Fetch existing profile
        profile = db.query(Profile).filter(Profile.user_email == current_user_email).first()

        if profile:
            # ── CRITICAL: reassign + flag_modified so SQLAlchemy detects JSONB changes ──
            profile.personal_info = personal_info_dict
            profile.skills        = skills_list
            profile.education     = parsed["education"]
            profile.experience    = parsed["work"]
            profile.projects      = parsed["projects"]

            flag_modified(profile, "personal_info")   # ← tell SQLAlchemy these changed
            flag_modified(profile, "skills")
            flag_modified(profile, "education")
            flag_modified(profile, "experience")
            flag_modified(profile, "projects")
        else:
            profile = Profile(
                user_id=current_user.id,
                user_email=current_user_email,
                personal_info=personal_info_dict,
                skills=skills_list,
                education=parsed["education"],
                experience=parsed["work"],
                projects=parsed["projects"]
            )
            db.add(profile)

        db.commit()
        db.refresh(profile)

    finally:
        if os.path.exists(file_location):
            os.remove(file_location)

    return {"detail": "Profile filled successfully"}
