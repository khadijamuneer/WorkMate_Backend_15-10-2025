import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const years = Array.from({ length: 27 }, (_, i) => 2000 + i); // 2000–2026

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
    education: [{ school: "", degree: "", startYear: "", endYear: "", present: false, cgpa: "" }],
    work: [{
      title: "", company: "", startMonth: "", startYear: "",
      endMonth: "", endYear: "", present: false, location: "", desc: [""],
    }],
    projects: [{ title: "", desc: [""] }],
  });

  const [workDescInputs, setWorkDescInputs] = useState([""]);
  const [projectDescInputs, setProjectDescInputs] = useState([""]);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");

  // 🧭 Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/profile/${email}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profile = res.data;

        // Parse existing education/work dates
        const education = profile.education?.map((edu) => {
          const [start, end] = edu.years?.split("-") || ["", ""];
          return {
            ...edu,
            startYear: start,
            endYear: end === "Present" ? "" : end,
            present: end === "Present",
          };
        }) || [];

        const work = profile.work?.map((job) => {
          const [start, end] = job.dates?.split(" - ") || ["", ""];
          const [startMonth, startYear] = start?.split(" ") || ["", ""];
          const [endMonth, endYear] = end === "Present" ? ["", ""] : end?.split(" ") || ["", ""];
          return {
            ...job,
            startMonth, startYear, endMonth, endYear,
            present: end === "Present",
          };
        }) || [];

        setFormData({ ...profile, education, work });
        setWorkDescInputs(work.map((w) => w.desc.join(", ")));
        setProjectDescInputs(profile.projects?.map((p) => p.desc.join(", ")) || [""]);
      } catch {
        console.log("No existing profile found.");
      }
    };
    fetchProfile();
  }, [email, token]);

  // Handlers
  const handlePersonalInfoChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      personal_info: { ...formData.personal_info, [name]: value },
    });
  };

  const handleSkillsChange = (e) => {
    setFormData({
      ...formData,
      skills: e.target.value.split(",").map((s) => s.trim()),
    });
  };

  const handleEducationChange = (i, field, value) => {
    const updated = [...formData.education];
    updated[i][field] = value;
    setFormData({ ...formData, education: updated });
  };

  const handleWorkChange = (i, field, value) => {
    const updated = [...formData.work];
    updated[i][field] = value;
    setFormData({ ...formData, work: updated });
  };

  const handleAddField = (section) => {
    const templates = {
      education: { school: "", degree: "", startYear: "", endYear: "", present: false, cgpa: "" },
      work: { title: "", company: "", startMonth: "", startYear: "", endMonth: "", endYear: "", present: false, location: "", desc: [""] },
      projects: { title: "", desc: [""] },
    };
    setFormData({ ...formData, [section]: [...formData[section], templates[section]] });
    if (section === "work") setWorkDescInputs([...workDescInputs, ""]);
    if (section === "projects") setProjectDescInputs([...projectDescInputs, ""]);
  };

  const handleWorkDescChange = (e, i) => {
    const updated = [...workDescInputs];
    updated[i] = e.target.value;
    setWorkDescInputs(updated);
  };

  const handleProjectDescChange = (e, i) => {
    const updated = [...projectDescInputs];
    updated[i] = e.target.value;
    setProjectDescInputs(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanedData = {
      ...formData,
      education: formData.education.map((edu) => ({
        ...edu,
        years: edu.present ? `${edu.startYear}-Present` : `${edu.startYear}-${edu.endYear}`,
      })),
      work: formData.work.map((job, i) => ({
        ...job,
        dates: job.present
          ? `${job.startMonth} ${job.startYear} - Present`
          : `${job.startMonth} ${job.startYear} - ${job.endMonth} ${job.endYear}`,
        desc: workDescInputs[i]?.split(",").map((d) => d.trim()) || [],
      })),
      projects: formData.projects.map((proj, i) => ({
        ...proj,
        desc: projectDescInputs[i]?.split(",").map((d) => d.trim()) || [],
      })),
    };

    try {
      await axios.put(`http://127.0.0.1:8000/profile/${email}`, cleanedData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("✅ Profile updated successfully!");
      navigate("/profile");
    } catch {
      await axios.post("http://127.0.0.1:8000/profile/", cleanedData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("🎉 Profile created successfully!");
      navigate("/profile");
    }
  };

  // ✨ Theme styles
  const styles = {
    layout: {
      display: "flex",
      minHeight: "100vh",
      fontFamily: "'Inter', sans-serif",
      backgroundColor: "#f8f9fb",
    },
    main: {
      flex: 1,
      backgroundColor: "#fff",
      padding: "3rem 4rem",
    },
    heading: {
      borderBottom: "1px solid #ccc",
      paddingBottom: "0.3rem",
      marginBottom: "1rem",
      color: "#3b4bff",
    },
    section: { marginBottom: "1.5rem" },
    input: {
      display: "block",
      marginBottom: "0.7rem",
      width: "100%",
      padding: "0.5rem",
      border: "1px solid #ccc",
      borderRadius: "8px",
      fontSize: "1rem",
    },
    select: {
      padding: "0.4rem",
      borderRadius: "8px",
      border: "1px solid #ccc",
      fontSize: "1rem",
      color: "#333",
      backgroundColor: "#f9faff",
    },
    addBtn: {
      backgroundColor: "#e7e9ff",
      color: "#3b4bff",
      border: "none",
      padding: "6px 10px",
      borderRadius: "8px",
      cursor: "pointer",
      marginBottom: "1rem",
    },
    saveBtn: {
      backgroundColor: "#3b4bff",
      color: "#fff",
      border: "none",
      padding: "10px 18px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: "1rem",
    },
  };

  return (
    <div style={styles.layout}>
      <Sidebar profile={formData} onLogout={() => navigate("/login")} />

      <div style={styles.main}>
        <h2 style={styles.heading}>
          {formData.id ? "Edit Profile" : "Create Profile"}
        </h2>
        {message && <p>{message}</p>}

        <form onSubmit={handleSubmit}>
          {/* ---------- Personal Info ---------- */}
          <div style={styles.section}>
            <h3 style={{ color: "#3b4bff" }}>Personal Information</h3>
            {Object.keys(formData.personal_info).map((key) => (
              <input
                key={key}
                name={key}
                placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                value={formData.personal_info[key]}
                onChange={handlePersonalInfoChange}
                required={key === "name" || key === "email"}
                style={styles.input}
              />
            ))}
          </div>

          {/* ---------- Skills ---------- */}
          <div style={styles.section}>
            <h3 style={{ color: "#3b4bff" }}>Skills</h3>
            <input
              placeholder="Comma-separated skills"
              value={formData.skills.join(",")}
              onChange={handleSkillsChange}
              style={styles.input}
            />
          </div>

          {/* ---------- Education ---------- */}
          <div style={styles.section}>
            <h3 style={{ color: "#3b4bff" }}>Education</h3>
            {formData.education.map((edu, i) => (
              <div key={i} style={{ marginBottom: "1rem" }}>
                <input
                  placeholder="School"
                  value={edu.school}
                  onChange={(e) => handleEducationChange(i, "school", e.target.value)}
                  style={styles.input}
                />
                <input
                  placeholder="Degree"
                  value={edu.degree}
                  onChange={(e) => handleEducationChange(i, "degree", e.target.value)}
                  style={styles.input}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <select
                    style={styles.select}
                    value={edu.startYear}
                    onChange={(e) => handleEducationChange(i, "startYear", e.target.value)}
                  >
                    <option value="">Start Year</option>
                    {years.map((y) => <option key={y}>{y}</option>)}
                  </select>
                  <span>-</span>
                  <select
                    style={styles.select}
                    value={edu.endYear}
                    onChange={(e) => handleEducationChange(i, "endYear", e.target.value)}
                    disabled={edu.present}
                  >
                    <option value="">End Year</option>
                    {years.map((y) => <option key={y}>{y}</option>)}
                  </select>
                  <label style={{ marginLeft: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={edu.present}
                      onChange={(e) => handleEducationChange(i, "present", e.target.checked)}
                    /> Present
                  </label>
                </div>
                <input
                  placeholder="CGPA"
                  value={edu.cgpa}
                  onChange={(e) => handleEducationChange(i, "cgpa", e.target.value)}
                  style={styles.input}
                />
              </div>
            ))}
            <button type="button" onClick={() => handleAddField("education")} style={styles.addBtn}>
              + Add Education
            </button>
          </div>

          {/* ---------- Work Experience ---------- */}
          <div style={styles.section}>
            <h3 style={{ color: "#3b4bff" }}>Work Experience</h3>
            {formData.work.map((job, i) => (
              <div key={i} style={{ marginBottom: "1rem" }}>
                <input
                  placeholder="Title"
                  value={job.title}
                  onChange={(e) => handleWorkChange(i, "title", e.target.value)}
                  style={styles.input}
                />
                <input
                  placeholder="Company"
                  value={job.company}
                  onChange={(e) => handleWorkChange(i, "company", e.target.value)}
                  style={styles.input}
                />
                <input
                  placeholder="Location"
                  value={job.location}
                  onChange={(e) => handleWorkChange(i, "location", e.target.value)}
                  style={styles.input}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <select
                    style={styles.select}
                    value={job.startMonth}
                    onChange={(e) => handleWorkChange(i, "startMonth", e.target.value)}
                  >
                    <option value="">Start Month</option>
                    {months.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <select
                    style={styles.select}
                    value={job.startYear}
                    onChange={(e) => handleWorkChange(i, "startYear", e.target.value)}
                  >
                    <option value="">Year</option>
                    {years.map((y) => <option key={y}>{y}</option>)}
                  </select>
                  <span>-</span>
                  <select
                    style={styles.select}
                    value={job.endMonth}
                    onChange={(e) => handleWorkChange(i, "endMonth", e.target.value)}
                    disabled={job.present}
                  >
                    <option value="">End Month</option>
                    {months.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <select
                    style={styles.select}
                    value={job.endYear}
                    onChange={(e) => handleWorkChange(i, "endYear", e.target.value)}
                    disabled={job.present}
                  >
                    <option value="">Year</option>
                    {years.map((y) => <option key={y}>{y}</option>)}
                  </select>
                  <label style={{ marginLeft: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={job.present}
                      onChange={(e) => handleWorkChange(i, "present", e.target.checked)}
                    /> Present
                  </label>
                </div>
                <input
                  placeholder="Description (comma separated)"
                  value={workDescInputs[i] || ""}
                  onChange={(e) => handleWorkDescChange(e, i)}
                  style={styles.input}
                />
              </div>
            ))}
            <button type="button" onClick={() => handleAddField("work")} style={styles.addBtn}>
              + Add Work
            </button>
          </div>

          {/* ---------- Projects ---------- */}
          <div style={styles.section}>
            <h3 style={{ color: "#3b4bff" }}>Projects</h3>
            {formData.projects.map((proj, i) => (
              <div key={i} style={{ marginBottom: "1rem" }}>
                <input
                  placeholder="Title"
                  value={proj.title}
                  onChange={(e) => handleWorkChange(i, "title", e.target.value)}
                  style={styles.input}
                />
                <input
                  placeholder="Description (comma separated)"
                  value={projectDescInputs[i] || ""}
                  onChange={(e) => handleProjectDescChange(e, i)}
                  style={styles.input}
                />
              </div>
            ))}
            <button type="button" onClick={() => handleAddField("projects")} style={styles.addBtn}>
              + Add Project
            </button>
          </div>

          <button type="submit" style={styles.saveBtn}>Save Profile</button>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
