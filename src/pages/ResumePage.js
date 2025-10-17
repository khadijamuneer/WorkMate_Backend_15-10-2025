import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

function ResumePage() {
  const [profile, setProfile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("email");

      if (!token || !email) {
        setMessage("Please login first.");
        return;
      }

      try {
        const res = await axios.get(`http://127.0.0.1:8000/profile/${email}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
      } catch (err) {
        setMessage("Error fetching profile data.");
        console.error(err);
      }
    };

    fetchProfile();
  }, []);

  const handleGenerate = async () => {
    if (!profile) return alert("Profile not loaded!");

    setLoading(true);
    setPdfUrl(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/generate_resume/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
      } else {
        alert("Error generating resume.");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to generate resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <h1 style={styles.heading}>Resume Generator</h1>

        {message && <p style={styles.message}>{message}</p>}

        {!profile ? (
          <p style={styles.loading}>Loading your profile...</p>
        ) : (
          <div style={styles.content}>
            {/* Left Column: Profile + Buttons */}
            <div style={styles.leftColumn}>
              <div style={styles.profileCard}>
                <p><strong>Name:</strong> {profile.personal_info?.name}</p>
                <p><strong>Email:</strong> {profile.personal_info?.email}</p>
                <p><strong>Location:</strong> {profile.personal_info?.location}</p>
                <p><strong>Skills:</strong> {profile.skills?.join(", ")}</p>
              </div>

              <div style={styles.buttonRow}>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  style={{
                    ...styles.button,
                    backgroundColor: loading ? "#9ca3af" : "#2563eb",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Generating..." : "Generate & Preview PDF"}
                </button>

                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    download="resume.pdf"
                    style={styles.downloadButton}
                  >
                    Download PDF
                  </a>
                )}
              </div>
            </div>

            {/* Right Column: PDF Preview */}
            <div style={styles.rightColumn}>
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  style={styles.previewFrame}
                  title="Resume Preview"
                ></iframe>
              ) : (
                <div style={styles.previewPlaceholder}>
                  <p style={{ color: "#6b7280" }}>
                    📝 Your resume preview will appear here after generation.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
    color: "#111827",
  },
  main: {
    flex: 1,
    padding: "2rem",
  },
  heading: {
    fontSize: "1.8rem",
    fontWeight: "bold",
    marginBottom: "1rem",
    color: "#2563eb",
  },
  message: {
    color: "#dc2626",
    marginBottom: "1rem",
  },
  loading: {
    color: "#6b7280",
  },
  content: {
    display: "flex",
    gap: "2rem",
    alignItems: "flex-start",
  },
  leftColumn: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
  },
  rightColumn: {
    flex: 1.2,
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "0.5rem",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
    minHeight: "600px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  profileCard: {
    marginBottom: "1rem",
    lineHeight: "1.6",
  },
  buttonRow: {
    display: "flex",
    gap: "1rem",
    marginTop: "1rem",
  },
  button: {
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "0.75rem 1.25rem",
    borderRadius: "8px",
    fontWeight: "500",
  },
  downloadButton: {
    backgroundColor: "#2563eb",
    color: "#fff",
    padding: "0.75rem 1.25rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "500",
  },
  previewFrame: {
    width: "100%",
    height: "600px",
    border: "none",
    borderRadius: "8px",
  },
  previewPlaceholder: {
    width: "100%",
    height: "600px",
    backgroundColor: "#f3f4f6",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};

export default ResumePage;