import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const EditProfile = () => {
  const [formData, setFormData] = useState({
    personal_info: {
      name: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
    },
    skills: [],
    education: [{ school: "", degree: "", years: "", cgpa: "" }],
    work: [{ title: "", company: "", dates: "", location: "", desc: [""] }],
    projects: [{ title: "", desc: [""] }],
  });

  const [workDescInputs, setWorkDescInputs] = useState(
    formData.work.map((w) => w.desc.join(", "))
  );
  const [projectDescInputs, setProjectDescInputs] = useState(
    formData.projects.map((p) => p.desc.join(", "))
  );

  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");

  // 🧭 Fetch existing profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/profile/${email}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFormData(res.data);
      } catch (err) {
        console.log("No existing profile found. Creating new one.");
      }
    };
    fetchProfile();
  }, [email, token]);

  // Update temporary desc inputs when formData changes
  useEffect(() => {
    setWorkDescInputs(formData.work.map((w) => w.desc.join(", ")));
    setProjectDescInputs(formData.projects.map((p) => p.desc.join(", ")));
  }, [formData.work, formData.projects]);

  // Handle change for personal info
  const handlePersonalInfoChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      personal_info: { ...formData.personal_info, [name]: value },
    });
  };

  // Handle input for dynamic array sections (education/work/projects)
  const handleArrayChange = (e, index, field, section) => {
    const updatedArray = [...formData[section]];
    updatedArray[index][field] = e.target.value;
    setFormData({ ...formData, [section]: updatedArray });
  };

  // Add new entry (education/work/project)
  const handleAddField = (section) => {
    const templates = {
      education: { school: "", degree: "", years: "", cgpa: "" },
      work: { title: "", company: "", dates: "", location: "", desc: [""] },
      projects: { title: "", desc: [""] },
    };
    setFormData({
      ...formData,
      [section]: [...formData[section], templates[section]],
    });

    // Also update temporary desc inputs
    if (section === "work") {
      setWorkDescInputs([...workDescInputs, ""]);
    } else if (section === "projects") {
      setProjectDescInputs([...projectDescInputs, ""]);
    }
  };

  // Handle skills (comma-separated)
  const handleSkillsChange = (e) => {
    setFormData({
      ...formData,
      skills: e.target.value.split(",").map((s) => s.trim()),
    });
  };

  // Handle description inputs for work/projects
  const handleWorkDescChange = (e, index) => {
    const newInputs = [...workDescInputs];
    newInputs[index] = e.target.value;
    setWorkDescInputs(newInputs);
  };

  const handleProjectDescChange = (e, index) => {
    const newInputs = [...projectDescInputs];
    newInputs[index] = e.target.value;
    setProjectDescInputs(newInputs);
  };

  // 🧾 Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare cleaned data
    const cleanedData = {
      ...formData,
      skills: formData.skills.map((s) => s.trim()),
      work: formData.work.map((w, i) => ({
        ...w,
        desc: workDescInputs[i].split(",").map((s) => s.trim()),
      })),
      projects: formData.projects.map((p, i) => ({
        ...p,
        desc: projectDescInputs[i].split(",").map((s) => s.trim()),
      })),
    };

    try {
      await axios.put(`http://127.0.0.1:8000/profile/${email}`, cleanedData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("✅ Profile updated successfully!");
      navigate("/profile");
    } catch (err) {
      try {
        await axios.post("http://127.0.0.1:8000/profile/", cleanedData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage("🎉 Profile created successfully!");
        navigate("/profile");
      } catch (error) {
        console.error(error);
        setMessage("❌ Error saving profile. Please check the form.");
      }
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "auto" }}>
      <h2 style={{ marginBottom: "1rem" }}>
        {formData.id ? "Edit Profile" : "Create Profile"}
      </h2>
      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        {/* ---------- Personal Info ---------- */}
        <h3>Personal Information</h3>
        {Object.keys(formData.personal_info).map((key) => (
          <input
            key={key}
            name={key}
            placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
            value={formData.personal_info[key]}
            onChange={handlePersonalInfoChange}
            required={key === "name" || key === "email"}
            style={{ display: "block", marginBottom: "0.5rem", width: "100%" }}
          />
        ))}

        {/* ---------- Skills ---------- */}
        <h3>Skills</h3>
        <input
          placeholder="Comma-separated skills"
          value={formData.skills.join(",")}
          onChange={handleSkillsChange}
          style={{ display: "block", marginBottom: "1rem", width: "100%" }}
        />

        {/* ---------- Education ---------- */}
        <h3>Education</h3>
        {formData.education.map((edu, i) => (
          <div key={i} style={{ marginBottom: "1rem" }}>
            <input
              placeholder="School"
              value={edu.school}
              onChange={(e) => handleArrayChange(e, i, "school", "education")}
            />
            <input
              placeholder="Degree"
              value={edu.degree}
              onChange={(e) => handleArrayChange(e, i, "degree", "education")}
            />
            <input
              placeholder="Years"
              value={edu.years}
              onChange={(e) => handleArrayChange(e, i, "years", "education")}
            />
            <input
              placeholder="CGPA"
              value={edu.cgpa || ""}
              onChange={(e) => handleArrayChange(e, i, "cgpa", "education")}
            />
          </div>
        ))}
        <button type="button" onClick={() => handleAddField("education")}>
          + Add Education
        </button>

        {/* ---------- Work Experience ---------- */}
        <h3>Work Experience</h3>
        {formData.work.map((job, i) => (
          <div key={i} style={{ marginBottom: "1rem" }}>
            <input
              placeholder="Title"
              value={job.title}
              onChange={(e) => handleArrayChange(e, i, "title", "work")}
            />
            <input
              placeholder="Company"
              value={job.company}
              onChange={(e) => handleArrayChange(e, i, "company", "work")}
            />
            <input
              placeholder="Dates"
              value={job.dates}
              onChange={(e) => handleArrayChange(e, i, "dates", "work")}
            />
            <input
              placeholder="Location"
              value={job.location}
              onChange={(e) => handleArrayChange(e, i, "location", "work")}
            />
            <input
              placeholder="Description (comma separated)"
              value={workDescInputs[i]}
              onChange={(e) => handleWorkDescChange(e, i)}
            />
          </div>
        ))}
        <button type="button" onClick={() => handleAddField("work")}>
          + Add Work
        </button>

        {/* ---------- Projects ---------- */}
        <h3>Projects</h3>
        {formData.projects.map((proj, i) => (
          <div key={i} style={{ marginBottom: "1rem" }}>
            <input
              placeholder="Title"
              value={proj.title}
              onChange={(e) => handleArrayChange(e, i, "title", "projects")}
            />
            <input
              placeholder="Description (comma separated)"
              value={projectDescInputs[i]}
              onChange={(e) => handleProjectDescChange(e, i)}
            />
          </div>
        ))}
        <button type="button" onClick={() => handleAddField("projects")}>
          + Add Project
        </button>

        <br />
        <button type="submit" style={{ marginTop: "1rem" }}>
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default EditProfile;