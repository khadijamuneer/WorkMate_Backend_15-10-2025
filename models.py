from sqlalchemy import Column, Integer, String, Text, ForeignKey, ARRAY, Date
from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy.dialects.postgresql import JSONB 

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(200), nullable=False)

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all,delete")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    user_email = Column(Text)
    education = Column(JSONB)
    experience = Column(JSONB)
    projects = Column(JSONB)
    skills = Column(JSONB)
    personal_info= Column(JSONB)

    user = relationship("User", back_populates="profile")

class JobScraped(Base):
    __tablename__ = "jobs_scraped"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text)
    company = Column(Text)
    location = Column(Text)
    link = Column(Text)
    preview_desc = Column(Text)
    full_desc = Column(Text)
    date_posted = Column(Text)
    skills = Column(ARRAY(Text))
    date_scraped = Column(Date)

    