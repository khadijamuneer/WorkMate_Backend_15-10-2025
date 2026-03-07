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
      if (!token || !email) { setMessage("Please login first."); return; }
      try {
        const res = await axios.get("http://127.0.0.1:8000/profile/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
      } catch (err) {
        if (err.response?.status === 404) navigate("/edit-profile");
        else setMessage("Error fetching profile or token expired.");
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    navigate("/login");
  };

  // ── small reusable components ───────────────────────────────────────────────
  const SectionHeader = ({ title, action }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <h3 style={{ margin: 0, fontSize: "0.8rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</h3>
      </div>
      {action}
      <div style={{ flex: 1, height: "1px", background: "#f3f4f6", marginLeft: "1rem" }} />
    </div>
  );

  const InfoRow = ({ label, value }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <span style={{ fontSize: "0.95rem", color: "#111827", fontWeight: "500" }}>{value || "—"}</span>
    </div>
  );

  if (!profile && !message) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f6fa", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
        <Sidebar profile={null} onLogout={handleLogout} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "#9ca3af" }}>
            <div style={{ width: "2rem", height: "2rem", border: "3px solid #e0e7ff", borderTop: "3px solid #3b4bff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ margin: 0, fontSize: "0.9rem" }}>Loading your profile…</p>
          </div>
          <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const name = profile?.personal_info?.name || "User";
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f6fa", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      <Sidebar profile={profile} onLogout={handleLogout} />

      <div style={{ flex: 1, padding: "2.5rem 3rem", maxWidth: "960px" }}>
        {message && (
          <div style={{ background: "#fff1f2", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: "10px", marginBottom: "1rem", fontSize: "0.875rem" }}>{message}</div>
        )}

        {profile && (
          <>
            {/* ── Hero card ── */}
            <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #ebebf0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: "1.5rem" }}>
              {/* Banner */}
              <div style={{ height: "80px", background: "linear-gradient(120deg, #3b4bff 0%, #7c8cff 60%, #a5b4fc 100%)" }} />

              {/* Avatar + name row */}
              <div style={{ padding: "0 2rem 1.75rem", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  {/* Avatar */}
                  <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, #3b4bff, #7c8cff)", border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: "700", color: "#fff", marginTop: "-36px", flexShrink: 0, boxShadow: "0 4px 12px rgba(59,75,255,0.3)" }}>
                    {initials}
                  </div>
                  {/* Edit button */}
                  <button
                    onClick={() => navigate("/edit-profile")}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0.5rem 1.1rem", background: "#f0f2ff", color: "#3b4bff", border: "none", borderRadius: "10px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit Profile
                  </button>
                </div>

                <div style={{ marginTop: "0.75rem" }}>
                  <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: "700", color: "#111827" }}>{name}</h2>
                  <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: "0.9rem" }}>{profile.personal_info?.email}</p>
                </div>

                {/* Quick info row */}
                <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
                  {profile.personal_info?.phone && (
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.85rem", color: "#6b7280" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      {profile.personal_info.phone}
                    </span>
                  )}
                  {profile.personal_info?.location && (
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.85rem", color: "#6b7280" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {profile.personal_info.location}
                    </span>
                  )}
                  {profile.personal_info?.linkedin && (
                    <button onClick={() => window.open(profile.personal_info.linkedin, "_blank")}
                      style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.85rem", color: "#3b4bff", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontWeight: "600" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                      LinkedIn
                    </button>
                  )}
                  {profile.personal_info?.github && (
                    <button onClick={() => window.open(profile.personal_info.github, "_blank")}
                      style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.85rem", color: "#374151", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontWeight: "600" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                      GitHub
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Skills ── */}
            {profile.skills?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0", padding: "1.5rem 2rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <SectionHeader title="Skills" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {profile.skills.map((skill, i) => (
                    <span key={i} style={{ background: "#f0f2ff", color: "#3b4bff", fontSize: "0.8rem", fontWeight: "600", padding: "5px 12px", borderRadius: "8px" }}>{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Education ── */}
            {profile.education?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0", padding: "1.5rem 2rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <SectionHeader title="Education" />
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {profile.education.map((edu, i) => (
                    <div key={i} style={{ flex: "1 1 280px", background: "#f8f9ff", border: "1px solid #e0e7ff", borderRadius: "12px", padding: "1rem 1.25rem" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#3b4bff", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
                        {edu.years}
                      </div>
                      <div style={{ fontWeight: "700", color: "#111827", fontSize: "0.95rem" }}>{edu.degree}</div>
                      <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "2px" }}>{edu.school}</div>
                      {edu.cgpa && <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "4px" }}>CGPA: {edu.cgpa}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Work Experience ── */}
            {profile.work?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0", padding: "1.5rem 2rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <SectionHeader title="Work Experience" />
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {profile.work.map((job, i) => (
                    <div key={i} style={{ display: "flex", gap: "1rem" }}>
                      {/* Timeline dot */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "3px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3b4bff", flexShrink: 0 }} />
                        {i < profile.work.length - 1 && <div style={{ width: "2px", flex: 1, background: "#e0e7ff", marginTop: "4px" }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: i < profile.work.length - 1 ? "0.5rem" : 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.25rem" }}>
                          <div>
                            <div style={{ fontWeight: "700", color: "#111827", fontSize: "0.95rem" }}>{job.title}</div>
                            <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>{job.company}{job.location ? ` · ${job.location}` : ""}</div>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: "600", background: "#f9fafb", padding: "3px 10px", borderRadius: "6px", whiteSpace: "nowrap" }}>{job.dates}</span>
                        </div>
                        {job.desc?.length > 0 && (
                          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "3px" }}>
                            {job.desc.map((d, j) => (
                              <li key={j} style={{ fontSize: "0.85rem", color: "#4b5563", lineHeight: "1.6" }}>{d}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Projects ── */}
            {profile.projects?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0", padding: "1.5rem 2rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <SectionHeader title="Projects" />
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {profile.projects.map((proj, i) => (
                    <div key={i} style={{ background: "#f8f9ff", border: "1px solid #e0e7ff", borderRadius: "12px", padding: "1rem 1.25rem" }}>
                      <div style={{ fontWeight: "700", color: "#3b4bff", fontSize: "0.95rem", marginBottom: "0.4rem" }}>{proj.title}</div>
                      {proj.desc?.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "3px" }}>
                          {proj.desc.map((d, j) => (
                            <li key={j} style={{ fontSize: "0.85rem", color: "#4b5563", lineHeight: "1.6" }}>{d}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
