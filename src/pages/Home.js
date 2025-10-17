
import React from "react";
import wmLogo from "../assets/wm_logo.png"; // Import the logo

const Home = () => {
  const navigate = (path) => {
    window.location.href = path;
  };

  // CSS styles as JS objects
  const styles = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      padding: "20px",
      backgroundColor: "#f0f0f0",
    },
    card: {
      width: "100%",
      maxWidth: "450px",
      padding: "40px",
      backgroundColor: "#fff",
      borderRadius: "16px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      textAlign: "center",
    },
    logo: {
      height: "50px",
      marginBottom: "30px",
    },
    heading: {
      fontSize: "2.5rem",
      fontWeight: "bold",
      marginBottom: "40px",
      color: "#1f2937",
    },
    buttonContainer: {
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    },
    buttonPrimary: {
      padding: "12px 20px",
      fontWeight: "600",
      borderRadius: "10px",
      border: "none",
      backgroundColor: "#4f46e5",
      color: "#fff",
      cursor: "pointer",
    },
    buttonSecondary: {
      padding: "12px 20px",
      fontWeight: "600",
      borderRadius: "10px",
      border: "1px solid #d1d5db",
      backgroundColor: "#fff",
      color: "#374151",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src={wmLogo} alt="WorkMate Logo" style={styles.logo} />
        <h2 style={styles.heading}>Welcome to WorkMate</h2>
        <div style={styles.buttonContainer}>
          <button
            style={styles.buttonPrimary}
            onClick={() => navigate("/login")}
          >
            SIGN IN
          </button>
          <button
            style={styles.buttonSecondary}
            onClick={() => navigate("/signup")}
          >
            CREATE ACCOUNT
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
