from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from resume_builder.generator import generate_resume
import os
import uuid

router = APIRouter(prefix="/generate_resume", tags=["Resume"])

@router.post("/")
def generate_resume_endpoint(profile: dict):
    """
    Accepts user profile JSON, generates a PDF using LaTeX template, and returns the PDF file.
    """
    try:
        unique_filename = f"resume_{uuid.uuid4().hex}.pdf"
        pdf_path = generate_resume(profile, output_pdf=unique_filename)

        # Return the PDF as a file response
        return FileResponse(
            path=pdf_path,
            filename="resume.pdf",
            media_type="application/pdf",
        )
    except Exception as e:
        print("Error generating resume:", e)
        raise HTTPException(status_code=500, detail="Failed to generate resume")