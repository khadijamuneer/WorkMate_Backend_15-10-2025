from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import User
from schemas import UserCreate, UserLogin, UserResponse
from auth import hash_password, verify_password, create_access_token
from fastapi.middleware.cors import CORSMiddleware
from userprofile import router as profile_router   # âœ… Import the profile router
from fastapi.responses import FileResponse
from resume_builder.generator import generate_resume
from resume_builder.routes import router as resume_router
from jobs.routes import router as jobs_router

import os 

# âœ… Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# âœ… CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (can restrict later)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "WorkMate API running ðŸš€"}

# âœ… Signup route
@app.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(user.password)
    new_user = User(name=user.name, email=user.email, password=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# âœ… Login route
@app.post("/login")
def login(request: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

# âœ… Include the Profile routes
app.include_router(profile_router)

@app.post("/generate_resume/")
async def generate_resume_endpoint(profile: dict):
    try:
        # Generate PDF using Tectonic
        pdf_path = generate_resume(profile)
        if not pdf_path or not os.path.exists(pdf_path):
            raise HTTPException(status_code=500, detail="PDF was not generated")
       
        # Return PDF to frontend
        return FileResponse(pdf_path, media_type="application/pdf", filename="resume.pdf")
   
    except Exception as e:
        # Return 500 error if PDF generation fails
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(resume_router)

app.include_router(jobs_router)