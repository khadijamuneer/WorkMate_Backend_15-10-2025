import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const ADDRESSING_OPTIONS_FALLBACK = [
  { key: "hiring_manager", label: "Dear Hiring Manager" },
  { key: "whom_it_may_concern", label: "To Whom It May Concern" },
  { key: "dear_sir_madam", label: "Dear Sir/Madam" },
  { key: "recruitment_team", label: "Dear Recruitment Team" },
  { key: "dear_team", label: "Dear Team" },
];

const CoverLetterPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const job = location.state?.job;

  const [addressingOptions, setAddressingOptions] = useState(ADDRESSING_OPTIONS_FALLBACK);
  const [addressingKey, setAddressingKey] = useState("hiring_manager");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error"); // "error" | "success"

  // Redirect if no job passed
  useEffect(() => {
    if (!job) {
      navigate("/jobs");
      return;
    }

    // Fetch addressing options from backend
    axios
      .get("http://127.0.0.1:8000/cover-letter/addressing-options")
      .then((res) => {
        if (res.data?.options?.length) {
          setAddressingOptions(res.data.options);
        }
      })
      .catch(() => {
        // use fallback silently
      });
  }, [job, navigate]);

  const handleGenerate = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("Please login first.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setPdfUrl(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/cover-letter/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job: {
            title: job.title,
            company: job.company,
            location: job.location,
            full_desc: job.full_desc || job.description,
            preview_desc: job.preview_desc || job.description,
            skills: job.skills || [],
          },
          addressing_key: addressingKey,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to generate cover letter");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setMessage("✅ Cover letter generated successfully!");
      setMessageType("success");
    } catch (err) {
      console.error(err);
      setMessage(`❌ ${err.message}`);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  if (!job) return null;

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <h1 style={styles.heading}>Cover Letter Generator</h1>

        {message && (
          <p style={{ ...styles.message, color: messageType === "success" ? "#10b981" : "#dc2626" }}>
            {message}
          </p>
        )}

        <div style={styles.content}>
          {/* ── LEFT COLUMN ── */}
          <div style={styles.leftColumn}>
            {/* Job Card */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📋 Target Job</h2>
              <p><strong>Title:</strong> {job.title}</p>
              <p><strong>Company:</strong> {job.company}</p>
              {job.location && <p><strong>Location:</strong> {job.location}</p>}
              {job.skills?.length > 0 && (
                <p><strong>Skills:</strong> {job.skills.join(", ")}</p>
              )}
            </div>

            {/* Addressing Dropdown */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>✉️ Addressing Style</h2>
              <p style={styles.helperText}>
                Choose how the cover letter should be addressed:
              </p>
              <select
                value={addressingKey}
                onChange={(e) => setAddressingKey(e.target.value)}
                style={styles.select}
              >
                {addressingOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div style={styles.buttonRow}>
              <button
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  ...styles.button,
                  backgroundColor: loading ? "#9ca3af" : "#3b4bff",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? (
                  <span style={styles.btnInner}>
                    <span style={styles.spinner} /> Generating...
                  </span>
                ) : (
                  "✉️ Generate Cover Letter"
                )}
              </button>

              {pdfUrl && (
                <a
                  href={pdfUrl}
                  download="cover_letter.pdf"
                  style={styles.downloadButton}
                >
                  ⬇️ Download PDF
                </a>
              )}
            </div>

            {/* Tip */}
            <div style={styles.tipBox}>
              <p style={styles.tipText}>
                💡 <strong>Tip:</strong> Your profile information (skills, experience, projects)
                is automatically used to craft a personalised letter for this specific job.
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN: PDF PREVIEW ── */}
          <div style={styles.rightColumn}>
            {loading && (
              <div style={styles.loadingOverlay}>
                <div style={styles.bigSpinner} />
                <p style={{ color: "#6b7280", marginTop: "1rem" }}>
                  Crafting your cover letter…
                </p>
              </div>
            )}

            {!loading && pdfUrl ? (
              <iframe
                src={pdfUrl}
                style={styles.previewFrame}
                title="Cover Letter Preview"
              />
            ) : (
              !loading && (
                <div style={styles.previewPlaceholder}>
                  <div style={styles.placeholderIcon}>✉️</div>
                  <p style={styles.placeholderText}>
                    Select an addressing style and click{" "}
                    <strong>"Generate Cover Letter"</strong> to preview your
                    personalised cover letter here.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f8f9fb",
    fontFamily: "'Inter', sans-serif",
  },
  main: {
    flex: 1,
    padding: "2.5rem 3rem",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  heading: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#3b4bff",
    textAlign: "center",
    marginBottom: "1.5rem",
  },
  message: {
    textAlign: "center",
    fontWeight: "500",
    marginBottom: "1rem",
    fontSize: "0.95rem",
  },
  content: {
    display: "flex",
    gap: "2rem",
    alignItems: "flex-start",
  },
  leftColumn: {
    flex: "0 0 380px",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  rightColumn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: "16px",
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
    backgroundColor: "#fff",
    padding: "1.5rem",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    lineHeight: "1.7",
    border: "1px solid #e5e7eb",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#3b4bff",
    marginBottom: "0.75rem",
  },
  helperText: {
    color: "#6b7280",
    fontSize: "0.9rem",
    marginBottom: "0.75rem",
  },
  select: {
    width: "100%",
    padding: "0.6rem 1rem",
    borderRadius: "10px",
    border: "1.5px solid #c7d2fe",
    backgroundColor: "#f5f6ff",
    color: "#1e1e2e",
    fontSize: "0.95rem",
    fontWeight: "500",
    outline: "none",
    cursor: "pointer",
    appearance: "auto",
  },
  buttonRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
  },
  button: {
    color: "#fff",
    border: "none",
    padding: "0.875rem 1.5rem",
    borderRadius: "12px",
    fontWeight: "600",
    fontSize: "0.95rem",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  btnInner: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  spinner: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    border: "2px solid rgba(255,255,255,0.4)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  downloadButton: {
    backgroundColor: "#10b981",
    color: "#fff",
    padding: "0.875rem 1.5rem",
    borderRadius: "12px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "0.95rem",
    display: "inline-block",
  },
  tipBox: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    padding: "1rem 1.25rem",
  },
  tipText: {
    color: "#1d4ed8",
    fontSize: "0.875rem",
    lineHeight: "1.6",
    margin: 0,
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
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "2rem",
    gap: "1rem",
  },
  placeholderIcon: {
    fontSize: "3rem",
  },
  placeholderText: {
    color: "#6b7280",
    textAlign: "center",
    fontSize: "0.95rem",
    lineHeight: "1.6",
    maxWidth: "300px",
  },
  loadingOverlay: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "700px",
  },
  bigSpinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e0e7ff",
    borderTop: "4px solid #3b4bff",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  },
};

export default CoverLetterPage;
