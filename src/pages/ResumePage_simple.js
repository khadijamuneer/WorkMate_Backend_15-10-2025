
import React, { useEffect, useState } from "react";
import axios from "axios";

function ResumePage() {
  const [profile, setProfile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false); // <-- new

  // Fetch profile when component loads
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

  // Generate resume PDF
  const handleGenerate = async () => {
    if (!profile) return alert("Profile not loaded!");

    setLoading(true);          // start spinner
    setPdfUrl(null);           // reset previous PDF if any

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
      setLoading(false);       // stop spinner
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Resume Generator</h1>
      {message && <p>{message}</p>}

      {!profile ? (
        <p>Loading your profile...</p>
      ) : (
        <>
          <div style={{ marginBottom: "1rem" }}>
            <p><strong>Name:</strong> {profile.personal_info?.name}</p>
            <p><strong>Email:</strong> {profile.personal_info?.email}</p>
            <p><strong>Location:</strong> {profile.personal_info?.location}</p>
            <p><strong>Skills:</strong> {profile.skills?.join(", ")}</p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}      // disable button while loading
            style={{
              backgroundColor: loading ? "#999" : "#4CAF50",
              color: "white",
              padding: "10px 15px",
              border: "none",
              borderRadius: "5px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating PDF..." : "Generate & Preview PDF"}

          </button>

          {pdfUrl && (
            <div style={{ marginTop: "2rem" }}>
              <iframe
                src={pdfUrl}
                width="100%"
                height="600px"
                title="Resume Preview"
              ></iframe>

              <a
                href={pdfUrl}
                download="resume.pdf"
                style={{
                  display: "inline-block",
                  marginTop: "1rem",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  padding: "10px 15px",
                  borderRadius: "5px",
                  textDecoration: "none",
                }}
              >
                Download PDF
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ResumePage;
