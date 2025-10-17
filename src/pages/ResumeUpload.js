import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a PDF or DOCX file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setExtractedText(data.extracted_text);
      } else {
        alert(data.detail || "Failed to process file");
      }
    } catch (err) {
      alert("Error uploading file.");
    } finally {
      setLoading(false);
    }
  };

  // ✨ Styling
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
      marginBottom: "2rem",
      color: "#3b4bff",
    },
    uploadBox: {
      width: "60%",
      margin: "0 auto",
      height: "180px",
      border: "2px dashed #ccc",
      borderRadius: "12px",
      backgroundColor: "#f1f2f4",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      color: "#777",
      fontSize: "1rem",
      cursor: "pointer",
      marginBottom: "1.5rem",
    },
    hiddenInput: {
      display: "none",
    },
    buttonRow: {
      display: "flex",
      gap: "1rem",
      marginBottom: "2rem",
      justifyContent: "center",
    },
    blueButton: {
      backgroundColor: "#3b4bff",
      color: "#fff",
      border: "none",
      padding: "10px 20px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: "1rem",
      minWidth: "160px",
      transition: "background 0.2s ease",
    },
    textContainer: {
      marginTop: "1rem",
      textAlign: "left",
      maxHeight: "400px",
      overflowY: "auto",
      backgroundColor: "#f9faff",
      border: "1px solid #ddd",
      borderRadius: "8px",
      padding: "1rem",
    },
  };

  return (
    <div style={styles.layout}>
      <Sidebar onLogout={() => navigate("/login")} />

      <div style={styles.main}>
        <h2 style={styles.heading}>Upload Your Resume</h2>

        {/* Upload Box */}
        <label style={styles.uploadBox}>
          {file ? (
            <>
              <strong>{file.name}</strong>
              <span style={{ fontSize: "0.9rem", color: "#555" }}>Click to change</span>
            </>
          ) : (
            <span>Select PDF/DOCX file</span>
          )}
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            style={styles.hiddenInput}
          />
        </label>

        {/* Buttons */}
        <div style={styles.buttonRow}>
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{
              ...styles.blueButton,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Extracting..." : "Extract"}
          </button>

          <button
            onClick={() => navigate("/resume-generator")}
            style={styles.blueButton}
          >
            Optimize Resume
          </button>
        </div>

        {/* Extracted text display */}
        {extractedText && (
          <div style={styles.textContainer}>
            <h3 style={{ color: "#3b4bff", marginBottom: "0.5rem" }}>Extracted Text:</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {extractedText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResumeUpload;