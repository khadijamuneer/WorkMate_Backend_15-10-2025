//work 9-12-2025
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("email");

      if (!token || !email) {
        setMessage("Please login first.");
        return;
      }

      try {
        const res = await axios.get(`http://127.0.0.1:8000/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          navigate("/edit-profile");
        } else {
          setMessage("Error fetching profile or token expired.");
        }
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    navigate("/login");
  };

  const handleEdit = () => navigate("/edit-profile");

  const styles = {
    layout: {
      display: "flex",
      minHeight: "100vh",
      fontFamily: "'Inter', sans-serif",
      backgroundColor: "#f8f9fb",
    },
    main: {
      flex: 1,
      padding: "3rem 4rem",
      backgroundColor: "#fff",
    },
    sectionTitleRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #ccc",
      paddingBottom: "0.3rem",
      marginTop: "1.5rem",
      marginBottom: "0.5rem",
    },
    sectionTitle: {
      fontWeight: "600",
    },
    editBtn: {
      backgroundColor: "#6b74ff",
      color: "#fff",
      border: "none",
      borderRadius: "5px",
      padding: "6px 12px",
      cursor: "pointer",
      fontSize: "0.9rem",
    },
    userDetailsGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "1rem",
      alignItems: "center",
      marginBottom: "1.5rem",
    },
    leftCol: {
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    },
    rightCol: {
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      alignItems: "flex-start",
    },
    label: {
      color: "#3b4bff",
      fontWeight: "600",
    },
    value: {
      color: "#000",
    },
    linkBtn: {
      backgroundColor: "#3b4bff",
      color: "#fff",
      padding: "6px 16px",
      borderRadius: "12px",
      border: "none",
      cursor: "pointer",
      fontSize: "0.9rem",
      marginRight: "0.5rem",
    },
    eduRowContainer: {
      display: "flex",
      gap: "2rem",
      flexWrap: "wrap",
    },
    eduCard: {
      backgroundColor: "#f5f6ff",
      padding: "1rem",
      borderRadius: "8px",
      flex: "1 1 45%",
    },
    blueText: { color: "#3b4bff", fontWeight: "500" },
  };

  return (
    <div style={styles.layout}>
      <Sidebar profile={profile} onLogout={handleLogout} />

      <div style={styles.main}>
        {message && <p>{message}</p>}

        {profile ? (
          <>
            <div style={styles.sectionTitleRow}>
              <h3 style={styles.sectionTitle}>User Details</h3>
              <button style={styles.editBtn} onClick={handleEdit}>
                Edit
              </button>
            </div>

            {/* Two-column layout for user details */}
            <div style={styles.userDetailsGrid}>
              <div style={styles.leftCol}>
                <div>
                  <span style={styles.label}>Name</span>
                  <div style={styles.value}>
                    {profile.personal_info?.name || "-"}
                  </div>
                </div>
                <div>
                  <span style={styles.label}>Email</span>
                  <div style={styles.value}>
                    {profile.personal_info?.email || "-"}
                  </div>
                </div>
                <div>
                  <span style={styles.label}>Phone</span>
                  <div style={styles.value}>
                    {profile.personal_info?.phone || "-"}
                  </div>
                </div>
              </div>

              <div style={styles.rightCol}>
                <div>
                  <span style={styles.label}>Location</span>
                  <div style={styles.value}>
                    {profile.personal_info?.location || "-"}
                  </div>
                </div>
                <div>
                  {profile.personal_info?.github && (
                    <button
                      style={styles.linkBtn}
                      onClick={() =>
                        window.open(profile.personal_info.github, "_blank")
                      }
                    >
                      GitHub
                    </button>
                  )}
                  {profile.personal_info?.linkedin && (
                    <button
                      style={styles.linkBtn}
                      onClick={() =>
                        window.open(profile.personal_info.linkedin, "_blank")
                      }
                    >
                      LinkedIn
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Education */}
            <div style={styles.sectionTitleRow}>
              <h3 style={styles.sectionTitle}>Education</h3>
            </div>
            <div style={styles.eduRowContainer}>
              {profile.education?.map((edu, i) => (
                <div key={i} style={styles.eduCard}>
                  <p style={styles.blueText}>{edu.degree}</p>
                  <p>{edu.school}</p>
                  <p>{edu.years}</p>
                </div>
              ))}
            </div>

            {/* Work Experience */}
            <div style={styles.sectionTitleRow}>
              <h3 style={styles.sectionTitle}>Work Experience</h3>
            </div>
            {profile.work?.map((job, i) => (
              <div key={i} style={{ marginBottom: "1rem" }}>
                <p style={styles.blueText}>{job.title}</p>
                <p>{job.company}</p>
                <p>{job.dates}</p>
                <ul>
                  {job.desc?.map((d, j) => (
                    <li key={j}>{d}</li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Projects */}
            <div style={styles.sectionTitleRow}>
              <h3 style={styles.sectionTitle}>Projects</h3>
            </div>
            {profile.projects?.map((proj, i) => (
              <div key={i} style={{ marginBottom: "1rem" }}>
                <p style={styles.blueText}>{proj.title}</p>
                <ul>
                  {proj.desc?.map((d, j) => (
                    <li key={j}>{d}</li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Skills */}
            <div style={styles.sectionTitleRow}>
              <h3 style={styles.sectionTitle}>Skills</h3>
            </div>
            {profile.skills && profile.skills.length > 0 ? (
              <ul
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  paddingLeft: 0,
                }}
              >
                {profile.skills.map((skill, i) => (
                  <li
                    key={i}
                    style={{
                      listStyle: "none",
                      backgroundColor: "#f5f6ff",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      color: "#3b4bff",
                      fontWeight: "500",
                    }}
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            ) : (
              <p>-</p>
            )}
          </>
        ) : (
          !message && <p>Loading profile...</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
