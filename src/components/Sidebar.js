
import React from "react";
import { useNavigate } from "react-router-dom";
import wmLogo from "../assets/wm_logo.png";

const Sidebar = ({ profile, onLogout }) => {
  const navigate = useNavigate();

  const styles = {
    sidebar: {
      width: "200px", // 🔹 Adjust sidebar width here
      backgroundColor: "#f0f0f0",
      padding: "2rem 1rem",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      borderRight: "1px solid #ddd",
      minHeight: "100vh",
    },
    logoContainer: {
      display: "flex",
      justifyContent: "center",
      marginBottom: "2rem",
      cursor: "pointer",
    },
    logo: {
      width: "100%", // 🔹 Makes logo fill sidebar width
      maxWidth: "160px", // Optional limit if image is too large

    },
    navItem: {
      fontSize: "1rem",
      marginBottom: "1rem",
      cursor: "pointer",
      color: "#333",
    },
    logout: {
      color: "red",
      fontWeight: "500",
      cursor: "pointer",
      marginTop: "2rem",
    },
    userFooter: {
      marginTop: "auto",
      borderTop: "1px solid #ccc",
      paddingTop: "1rem",
      fontSize: "0.9rem",
      color: "#555",
    },
  };

  return (
    <div style={styles.sidebar}>
      <div>
        <div style={styles.logoContainer} onClick={() => navigate("/profile")}>
          <img src={wmLogo} alt="WorkMate Logo" style={styles.logo} />
        </div>

        <div style={styles.navItem} onClick={() => navigate("/profile")}>
          My Profile
        </div>
        <div style={styles.navItem} onClick={() => navigate("/resume")}>
          My Resumes
        </div>
        <div style={styles.navItem} onClick={() => navigate("/jobs")}>
          Jobs
        </div>
        <div style={styles.navItem}>Interview Prep</div>
        <div style={styles.navItem}>Learn Skills</div>
        <div style={styles.logout} onClick={onLogout}>
          Logout
        </div>
      </div>

      <div style={styles.userFooter}>
        <div>
          <strong>{profile?.personal_info?.name || "User"}</strong>
        </div>
        <div>{profile?.personal_info?.email}</div>
      </div>
    </div>
  );
};

export default Sidebar;
