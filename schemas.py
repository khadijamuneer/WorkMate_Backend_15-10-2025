from pydantic import BaseModel
from typing import List, Optional 

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        orm_mode = True

# -------------------- Profile Schemas --------------------
class Education(BaseModel):
    school: str
    degree: str
    years: str
    cgpa: Optional[str] = None

class Work(BaseModel):
    title: str
    company: str
    dates: str
    location: Optional[str] = None
    desc: List[str]

class Project(BaseModel):
    title: str
    desc: List[str]

class PersonalInfo(BaseModel):
    name: str
    email: str
    phone: str
    location: str
    linkedin: Optional[str] = None
    github: Optional[str] = None

class ProfileBase(BaseModel):
    personal_info: PersonalInfo
    skills: List[str]
    education: List[Education]
    work: List[Work]
    projects: List[Project]

class ProfileCreate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    id: int
    user_email: str

    class Config:
        orm_mode = True


# -------------------- Job Schemas --------------------
from datetime import date

class JobBase(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    link: Optional[str] = None
    preview_desc: Optional[str] = None
    full_desc: Optional[str] = None
    date_posted: Optional[str] = None
    skills: Optional[List[str]] = None

class JobCreate(JobBase):
    pass

class JobResponse(JobBase):
    id: int
    date_scraped: Optional[date] = None

    class Config:
        orm_mode = True


