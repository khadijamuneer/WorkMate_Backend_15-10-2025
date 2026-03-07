import os
import subprocess
import tempfile
import groq
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY_COVER_LETTER")
client = groq.Client(api_key=GROQ_API_KEY)

TEMPLATE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cover_letter_template.tex")
TECTONIC_PATH = r"C:\Users\HP\tectonic.exe"

ADDRESSING_OPTIONS = {
    "hiring_manager":      "Dear Hiring Manager,",
    "whom_it_may_concern": "To Whom It May Concern,",
    "dear_sir_madam":      "Dear Sir/Madam,",
    "recruitment_team":    "Dear Recruitment Team,",
    "dear_team":           "Dear Team,",
}


# ── LLM ──────────────────────────────────────────────────────────────────────
def generate_cover_letter_content(profile: dict, job: dict) -> str:
    personal = profile.get("personal_info", {})
    name     = personal.get("name", "")
    skills   = ", ".join(profile.get("skills", []))

    work_summary = ""
    for w in profile.get("work", []):
        descs = "; ".join(w.get("desc", []))
        work_summary += f"{w.get('title')} at {w.get('company')} ({w.get('dates')}): {descs}. "

    project_summary = ""
    for p in profile.get("projects", []):
        descs = "; ".join(p.get("desc", []))
        project_summary += f"{p.get('title')}: {descs}. "

    prompt = f"""You are a professional cover letter writer.
Write ONLY the body paragraphs (3-4 paragraphs) of a cover letter.

CANDIDATE:
Name: {name}
Skills: {skills}
Work Experience: {work_summary}
Projects: {project_summary}

JOB:
Title: {job.get('title', '')}
Company: {job.get('company', '')}
Description: {job.get('full_desc') or job.get('preview_desc', '')}
Required Skills: {', '.join(job.get('skills') or [])}

STRICT RULES:
- Output ONLY the body paragraphs. Nothing else.
- NO salutation, NO closing, NO name at the end.
- NO quotation marks anywhere in the text.
- NO commentary, preamble, labels, or meta-text whatsoever.
- NO placeholder brackets like [Your Name] or [Company Name].
- Paragraphs separated by a single blank line.
- First-person, confident, professional tone.
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=800,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()


# ── LaTeX helpers ─────────────────────────────────────────────────────────────
def escape_latex(text: str) -> str:
    if not text:
        return ""
    replacements = [
        ("\\", r"\textbackslash{}"),
        ("&",  r"\&"),
        ("%",  r"\%"),
        ("$",  r"\$"),
        ("#",  r"\#"),
        ("_",  r"\_"),
        ("{",  r"\{"),
        ("}",  r"\}"),
        ("~",  r"\textasciitilde{}"),
        ("^",  r"\textasciicircum{}"),
    ]
    for char, repl in replacements:
        text = text.replace(char, repl)
    return text


def body_to_latex(body: str) -> str:
    paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
    result = []
    for p in paragraphs:
        p = " ".join(p.split("\n"))
        result.append(escape_latex(p))
    return "\n\n".join(result)


def build_links(linkedin: str, github: str) -> str:
    parts = []
    if linkedin:
        parts.append(r" \textbar\ \href{" + linkedin + r"}{LinkedIn}")
    if github:
        parts.append(r" \textbar\ \href{" + github + r"}{GitHub}")
    return "".join(parts)


# ── Main pipeline ─────────────────────────────────────────────────────────────
def generate_cover_letter_pdf(
    profile: dict,
    job: dict,
    addressing_key: str = "hiring_manager",
) -> bytes:

    body_text  = generate_cover_letter_content(profile, job)

    personal   = profile.get("personal_info", {})
    addressing = ADDRESSING_OPTIONS.get(addressing_key, "Dear Hiring Manager,")
    linkedin   = personal.get("linkedin") or ""
    github     = personal.get("github")   or ""

    substitutions = {
        "<<SENDER_NAME>>":       escape_latex(personal.get("name",     "")),
        "<<SENDER_EMAIL>>":      personal.get("email", ""),
        "<<SENDER_PHONE>>":      escape_latex(personal.get("phone",    "")),
        "<<SENDER_LOCATION>>":   escape_latex(personal.get("location", "")),
        "<<SENDER_LINKS>>":      build_links(linkedin, github),
        "<<ADDRESSING_LINE>>":   addressing,
        "<<JOB_TITLE>>":         escape_latex(job.get("title",   "")),
        "<<COMPANY_NAME>>":      escape_latex(job.get("company", "")),
        "<<COVER_LETTER_BODY>>": body_to_latex(body_text),
    }

    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        template = f.read()

    for placeholder, value in substitutions.items():
        template = template.replace(placeholder, value)

    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, "cover_letter.tex")
        pdf_path = os.path.join(tmpdir, "cover_letter.pdf")

        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(template)

        result = subprocess.run(
            [TECTONIC_PATH, tex_path, "--outdir", tmpdir],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"Tectonic failed.\nSTDOUT: {result.stdout.decode()}\nSTDERR: {result.stderr.decode()}"
            )

        with open(pdf_path, "rb") as f:
            return f.read()