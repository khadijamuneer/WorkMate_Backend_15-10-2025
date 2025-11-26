import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";

function TailorResumePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const job = location.state?.job; // Job passed from JobsPage

  const [profile, setProfile] = useState(null);
  const [tailoredData, setTailoredData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!job) {
      setMessage("No job selected. Redirecting...");
      setTimeout(() => navigate("/jobs"), 2000);
      return;
    }

    fetchProfile();
  }, [job, navigate]);

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

  // -----------------------------
  // Merge Tailor + Generate PDF
  // -----------------------------
  const handleTailorAndGenerate = async () => {
    if (!profile || !job) return;

    setTailoring(true);
    setMessage("");

    try {
      // 1️⃣ Tailor resume
      const response = await axios.post("http://127.0.0.1:8000/tailor/resume", {
        email: localStorage.getItem("email"),
        job: {
          title: job.title,
          company: job.company,
          full_desc: job.full_desc || job.description,
          preview_desc: job.preview_desc || job.description,
          skills: job.skills || [],
        },
      });

      if (response.data.success) {
        const tailored = response.data.tailored_resume;
        setTailoredData(tailored);
        setMessage("Resume tailored successfully! Generating PDF...");

        // 2️⃣ Generate PDF immediately
        setLoading(true);
        const pdfResponse = await fetch("http://127.0.0.1:8000/tailor/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: localStorage.getItem("email"),
            tailored_data: tailored,
            original_profile: profile,
          }),
        });

        if (pdfResponse.ok) {
          const blob = await pdfResponse.blob();
          const url = window.URL.createObjectURL(blob);
          setPdfUrl(url);
          setMessage("✅ Resume tailored and PDF generated!");
        } else {
          setMessage("❌ Error generating PDF.");
        }
      }
    } catch (err) {
      console.error("Error tailoring and generating PDF:", err);
      setMessage("❌ Failed to tailor or generate PDF. Please try again.");
    } finally {
      setTailoring(false);
      setLoading(false);
    }
  };

  if (!job) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <main style={styles.main}>
          <p style={styles.message}>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <h1 style={styles.heading}>Tailor Your Resume</h1>

        {message && <p style={styles.message}>{message}</p>}

        <div style={styles.content}>
          {/* Left Column: Job & Profile Info */}
          <div style={styles.leftColumn}>
            {/* Job Details */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📋 Target Job</h2>
              <p><strong>Title:</strong> {job.title}</p>
              <p><strong>Company:</strong> {job.company}</p>
              <p><strong>Location:</strong> {job.location || "N/A"}</p>
              {job.skills && job.skills.length > 0 && (
                <p><strong>Skills Required:</strong> {job.skills.join(", ")}</p>
              )}
              <p style={styles.description}>
                <strong>Description:</strong><br />
                {job.preview_desc || job.description || "No description available"}
              </p>
            </div>

            {/* User Profile */}
            {profile && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>👤 Your Profile</h2>
                <p><strong>Name:</strong> {profile.personal_info?.name}</p>
                <p><strong>Email:</strong> {profile.personal_info?.email}</p>
                <p><strong>Skills:</strong> {profile.skills?.join(", ")}</p>
              </div>
            )}

            {/* Tailored Summary Preview */}
            {tailoredData && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>✨ Tailored Summary</h2>
                <p style={styles.summaryText}>{tailoredData.tailored_summary}</p>
                
                <h3 style={styles.subHeading}>Prioritized Skills:</h3>
                <p>{tailoredData.tailored_skills?.join(", ")}</p>
              </div>
            )}

            {/* Single Tailor & Generate Button */}
            <div style={styles.buttonRow}>
              <button
                onClick={handleTailorAndGenerate}
                disabled={tailoring || loading}
                style={{
                  ...styles.button,
                  backgroundColor: tailoring || loading ? "#9ca3af" : "#2563eb",
                  cursor: tailoring || loading ? "not-allowed" : "pointer",
                }}
              >
                {tailoring || loading ? "Processing..." : "🎯 Tailor & Generate Resume"}
              </button>

              {pdfUrl && (
                <a
                  href={pdfUrl}
                  download="tailored_resume.pdf"
                  style={styles.downloadButton}
                >
                  ⬇️ Download PDF
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
                title="Tailored Resume Preview"
              ></iframe>
            ) : (
              <div style={styles.previewPlaceholder}>
                <p style={{ color: "#6b7280", textAlign: "center" }}>
                  {tailoredData
                    ? "📝 Generating PDF..."
                    : "🎯 Click 'Tailor & Generate Resume' to begin customizing your resume for this job"}
                </p>
              </div>
            )}
          </div>
        </div>
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
    maxWidth: "1400px",
    margin: "0 auto",
  },
  heading: {
    fontSize: "2rem",
    fontWeight: "bold",
    marginBottom: "1rem",
    color: "#2563eb",
    textAlign: "center",
  },
  message: {
    color: "#dc2626",
    marginBottom: "1rem",
    textAlign: "center",
    fontWeight: "500",
  },
  content: {
    display: "flex",
    gap: "2rem",
    alignItems: "flex-start",
  },
  leftColumn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  rightColumn: {
    flex: 1.2,
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "1rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    minHeight: "700px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "sticky",
    top: "2rem",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
    lineHeight: "1.6",
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#2563eb",
    marginBottom: "1rem",
  },
  subHeading: {
    fontSize: "1rem",
    fontWeight: "600",
    marginTop: "1rem",
    marginBottom: "0.5rem",
  },
  description: {
    color: "#4b5563",
    fontSize: "0.95rem",
    lineHeight: "1.6",
  },
  summaryText: {
    fontStyle: "italic",
    color: "#374151",
    lineHeight: "1.7",
  },
  buttonRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
  },
  button: {
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "0.875rem 1.5rem",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  downloadButton: {
    backgroundColor: "#10b981",
    color: "#fff",
    padding: "0.875rem 1.5rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "0.95rem",
    display: "inline-block",
  },
  previewFrame: {
    width: "100%",
    height: "700px",
    border: "none",
    borderRadius: "8px",
  },
  previewPlaceholder: {
    width: "100%",
    height: "700px",
    backgroundColor: "#f3f4f6",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "2rem",
  },
};

export default TailorResumePage;