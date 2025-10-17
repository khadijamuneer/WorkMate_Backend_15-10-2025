
import React, { useState } from "react";
import axios from "axios";
import wmLogo from "../assets/wm_logo.png"; // your logo

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://127.0.0.1:8000/login", formData);
      const token = res.data.access_token;

      localStorage.setItem("token", token);
      localStorage.setItem("email", formData.email);
      setMessage("Login successful!");

      try {
        const profileRes = await axios.get(
          `http://127.0.0.1:8000/profile/${formData.email}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (profileRes.status === 200) {
          window.location.href = "/profile";
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          window.location.href = "/edit-profile";
        } else {
          console.error(error);
          setMessage("Error checking profile.");
        }
      }
    } catch (err) {
      setMessage(err.response?.data?.detail || "Login failed");
    }
  };

  // Styles as JS objects
  const styles = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f0f0f0",
      padding: "20px",
    },
    card: {
      width: "100%",
      maxWidth: "400px",
      padding: "40px",
      backgroundColor: "#fff",
      borderRadius: "16px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      textAlign: "center",
    },
    logo: {
      height: "60px",
      marginBottom: "30px",
    },
    input: {
      width: "100%",
      padding: "12px 15px",
      marginBottom: "20px",
      borderRadius: "10px",
      border: "1px solid #d1d5db",
      fontSize: "1rem",
      boxSizing: "border-box",

    },
    button: {
      width: "100%",
      padding: "12px",
      borderRadius: "10px",
      border: "none",
      backgroundColor: "#4f46e5",
      color: "#fff",
      fontWeight: "600",
      fontSize: "1rem",
      cursor: "pointer",
      marginBottom: "15px",
    },
    linkText: {
      fontSize: "0.9rem",
      color: "#6b7280", // grey color
      cursor: "pointer",
      textDecoration: "underline",
    },
    message: {
      marginTop: "15px",
      color: "red",
      fontSize: "0.9rem",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src={wmLogo} alt="WorkMate Logo" style={styles.logo} />
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            required
            style={styles.input}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            required
            style={styles.input}
          />
          <button type="submit" style={styles.button}>
            Login
          </button>
        </form>
        <div
          style={styles.linkText}
          onClick={() => (window.location.href = "/signup")}
        >
          Don't have an account? Sign up
        </div>
        {message && <div style={styles.message}>{message}</div>}
      </div>
    </div>
  );
};

export default Login;
