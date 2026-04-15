from sqlalchemy import Column, Integer, String, JSON, ForeignKey, Date, Text
from sqlalchemy.dialects.postgresql import JSONB
from database import Base
from sqlalchemy import Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy import LargeBinary 

# -----------------------------
# User Model
# -----------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)


# -----------------------------
# Profile Model
# -----------------------------
class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_email = Column(String, index=True)

    personal_info = Column(JSON)
    education = Column(JSON)
    experience = Column(JSON)
    projects = Column(JSON)
    skills = Column(JSON)


# -----------------------------
# Scraped Jobs Model (REQUIRED)
# -----------------------------
class JobScraped(Base):
    __tablename__ = "jobs_scraped"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, index=True)
    company = Column(String)
    location = Column(String)
    link = Column(String)

    preview_desc = Column(String)
    full_desc = Column(String)

    skills = Column(JSON)
    date_posted = Column(Date)
    extracted_skills = Column(JSON, nullable=True) # cached NLP skills
    embedding = Column(LargeBinary, nullable=True) # serialized float32 vector
    exp_score = Column(Float, nullable=True) # cached experience score

class InterviewResult(Base):
    __tablename__ = "interview_results"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    user_email = Column(Text)

    job_title = Column(Text)
    job_company = Column(Text)
    job_location = Column(Text)

    overall_score = Column(Float)
    voice_score = Column(Float)
    eye_contact_score = Column(Float)
    posture_score = Column(Float)
    content_score = Column(Float)

    voice_label = Column(Text)
    eye_contact_label = Column(Text)
    posture_label = Column(Text)

    total_words = Column(Integer)
    words_per_min = Column(Float)
    filler_count = Column(Integer)
    filler_rate = Column(Float)
    filler_pct = Column(Float)
    repetitions = Column(Integer)
    duration_sec = Column(Float)

    transcript = Column(Text)  # 🔥 IMPORTANT ADD

    full_results = Column(JSONB)
    questions = Column(JSONB)

    interview_type = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
