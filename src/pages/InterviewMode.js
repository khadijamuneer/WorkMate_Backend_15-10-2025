import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function InterviewMode() {
  const location = useLocation();
  const navigate = useNavigate();
  const job = location.state?.job;

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <div style={styles.container}>
          <h1 style={styles.title}>Choose your mock interview mode</h1>
          
          <div style={styles.cardContainer}>
            {/* TEXT INTERVIEW CARD */}
            <div
              style={styles.card}
              onClick={() => navigate("/text-interview", { state: { job } })}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(59, 75, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.08)";
              }}
            >
              <div style={styles.iconContainer}>
                <div style={{ ...styles.icon, backgroundColor: "#3b4bff" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2"/>
                    <line x1="7" y1="8" x2="17" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="7" y1="12" x2="17" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="7" y1="16" x2="13" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              <h2 style={styles.cardTitle}>Text Mock Interview</h2>
              <p style={styles.cardDescription}>
                Type out your answers to questions you see on the screen.
              </p>
            </div>

            {/* VIDEO INTERVIEW CARD (Coming Soon) */}
            <div
              style={{ ...styles.card, ...styles.disabledCard }}
            >
              <div style={styles.iconContainer}>
                <div style={{ ...styles.icon, backgroundColor: "#9ca3af" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="14" height="14" rx="2" stroke="white" strokeWidth="2"/>
                    <path d="M16 10L22 7V17L16 14V10Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <h2 style={styles.cardTitle}>Video Mock Interview</h2>
              <p style={styles.cardDescription}>
                Speak out your answers to questions you see on the screen.
              </p>
              <div style={styles.comingSoonBadge}>
                <span style={styles.comingSoonText}>Required access to your system's webcam. For best results, please ensure best lighting and clear speech.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f8f9fb",
  },
  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
  },
  container: {
    width: "100%",
    maxWidth: "1100px",
  },
  title: {
    fontSize: "36px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "60px",
    textAlign: "center",
    letterSpacing: "-0.5px",
  },
  cardContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "40px",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "40px 32px",
    border: "2px solid #e5e7eb",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
  },
  disabledCard: {
    cursor: "not-allowed",
    opacity: 0.6,
  },
  iconContainer: {
    marginBottom: "24px",
    display: "flex",
    justifyContent: "center",
  },
  icon: {
    width: "80px",
    height: "80px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 20px rgba(59, 75, 255, 0.3)",
  },
  cardTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#3b4bff",
    marginBottom: "16px",
    letterSpacing: "-0.3px",
  },
  cardDescription: {
    fontSize: "15px",
    color: "#6b7280",
    lineHeight: "1.6",
    margin: 0,
  },
  comingSoonBadge: {
    marginTop: "20px",
    padding: "8px 16px",
    backgroundColor: "#f3f4f6",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: "1.5",
  },
  comingSoonText: {
    fontWeight: "500",
  },
};

export default InterviewMode;