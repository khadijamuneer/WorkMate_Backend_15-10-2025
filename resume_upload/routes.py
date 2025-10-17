
from fastapi import APIRouter, UploadFile, File, HTTPException
import pdfplumber
import docx

router = APIRouter(prefix="/resume", tags=["Resume Upload"])

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    # Validate file type
    if not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed.")

    text_content = ""

    try:
        # Handle PDF
        if file.filename.lower().endswith(".pdf"):
            with pdfplumber.open(file.file) as pdf:
                for page in pdf.pages:
                    text_content += page.extract_text() or ""
       
        # Handle DOCX
        elif file.filename.lower().endswith(".docx"):
            doc = docx.Document(file.file)
            for para in doc.paragraphs:
                text_content += para.text + "\n"

        return {"filename": file.filename, "extracted_text": text_content.strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {e}")