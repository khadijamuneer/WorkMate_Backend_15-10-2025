from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Profile, User
from schemas import ProfileCreate
import re
import pdfplumber
from docx import Document
from groq import Groq
from datetime import datetime
import json
import os
from dotenv import load_dotenv
from auth import get_current_user
from models import User 

router = APIRouter(prefix="/resume", tags=["Resume"])

# -------------------------
# Groq Client (LLM)
# -------------------------
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY_RESUME_UPLOAD")

if not GROQ_API_KEY:
    raise ValueError("Missing GROQ_API_KEY_RESUME_UPLOAD")

client = Groq(api_key=GROQ_API_KEY)




# -------------------------
# Prompt engineering (carefully crafted)
# -------------------------
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
   - A document is likely *not a resume* if it lacks references to work, education, experience, or contact details, or if it reads as a narrative, story, or essay.
3. Try to extract email and phone using patterns. Prefer the explicit fields found on the document (e.g., "Email:", "Phone:", "Contact:"), but if not present, look in header/footer or the whole text. If multiple candidates found, choose the most plausible (first-occurring).
4. For dates/years, prefer the format shown in the example, but accept other reasonable formats as strings. If ranges or single-year only are present, return them as-is (string).
5. For work/education/projects descriptions, put each bullet/line item as a separate string in the desc array. If only paragraph text is available, break into sensible sentence-sized items.
6. Do not hallucinate. If a specific field cannot be confidently inferred, set it to "not available".
7. Be conservative: do not invent company names, degrees, or years.
8. Maintain the exact JSON keys as in the sample. Do not add extra top-level keys.

Now parse the following DOCUMENT_TEXT provided in the "user" message and return the JSON object exactly as required.
"""

PROMPT_USER_TEMPLATE = "DOCUMENT_TEXT:\n\n'''{text}'''\n\nReturn the JSON now."

# -------------------------
# PDF / DOCX text extraction
# -------------------------
def extract_text_from_pdf(path):
    import statistics
    all_text = []
    try:
        with pdfplumber.open(path) as pdf:
            for i, page in enumerate(pdf.pages):
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
                        safe_left_bbox = (0, 0, min(mid_x, page.width), min(page.height, page.height))
                        safe_right_bbox = (mid_x, 0, min(page.width, page.width), min(page.height, page.height))
                        try:
                            left_text = page.within_bbox(safe_left_bbox).extract_text() or ""
                            right_text = page.within_bbox(safe_right_bbox).extract_text() or ""
                            page_text = left_text.strip() + "\n" + right_text.strip()
                        except Exception:
                            page_text = page.extract_text() or ""
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
        paragraphs = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
        return "\n".join(paragraphs).strip()
    except Exception as e:
        print("DOCX extraction error:", e)
        return ""

# -------------------------
# Route: Autofill Profile
# -------------------------
@router.post("/autofill")
def autofill_profile(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # <-- actual logged-in user
):
    current_user_email = current_user.email  # use this for all profile updates

    if not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Save file temporarily
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
        system_msg = {"role": "system", "content": PROMPT_SYSTEM}
        user_msg = {"role": "user", "content": PROMPT_USER_TEMPLATE.format(text=text[:50000])}

        try:
            chat_completion = client.chat.completions.create(
                messages=[system_msg, user_msg],
                model="llama-3.1-8b-instant",
                temperature=0.0,
                max_tokens=1500
            )
            raw_output = chat_completion.choices[0].message.content
            parsed = json.loads(raw_output)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error parsing resume: {e}")

        # Fetch logged-in user
        user = db.query(User).filter(User.email == current_user_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Fetch existing profile
        profile = db.query(Profile).filter(Profile.user_email == current_user_email).first()

        # Prepare profile data
        personal_info_dict = parsed["personal_info"]
        personal_info_dict["email"] = current_user_email

        skills_list = []
        if parsed["skills"] and parsed["skills"][0] != "not available":
            skills_list = [s.strip() for s in parsed["skills"][0].split(",")]

        profile_data_dict = {
            "personal_info": personal_info_dict,
            "skills": skills_list,
            "education": parsed["education"],
            "experience": parsed["work"],
            "projects": parsed["projects"]
        }

        if profile:
            # Update existing profile
            profile.personal_info = profile_data_dict["personal_info"]
            profile.skills = profile_data_dict["skills"]
            profile.education = profile_data_dict["education"]
            profile.experience = profile_data_dict["experience"]
            profile.projects = profile_data_dict["projects"]
        else:
            # Create new profile
            profile = Profile(
                user_id=user.id,
                user_email=current_user_email,
                personal_info=profile_data_dict["personal_info"],
                skills=profile_data_dict["skills"],
                education=profile_data_dict["education"],
                experience=profile_data_dict["experience"],
                projects=profile_data_dict["projects"]
            )
            db.add(profile)

        db.commit()
        db.refresh(profile)

    finally:
        # Delete temporary file
        if os.path.exists(file_location):
            os.remove(file_location)

    return {"detail": "Profile filled successfully"}
