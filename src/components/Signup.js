
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import wmLogo from "../assets/wm_logo.png"; // your logo

const Signup = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://127.0.0.1:8000/signup", formData);
      setMessage("Signup successful! Redirecting...");

      const loginRes = await axios.post("http://127.0.0.1:8000/login", {
        email: formData.email,
        password: formData.password,
      });

      localStorage.setItem("token", loginRes.data.access_token);
      localStorage.setItem("email", formData.email);

      try {
        const profileRes = await axios.get(`http://127.0.0.1:8000/profile/${formData.email}`, {
          headers: { Authorization: `Bearer ${loginRes.data.access_token}` },
        });

        if (profileRes.data) navigate("/profile");
      } catch {
        navigate("/edit-profile");
      }

    } catch (err) {
      setMessage(err.response?.data?.detail || "Signup failed");
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
      padding: "12px 15px",
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
      color: "#6b7280",
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
            name="name"
            placeholder="Name"
            onChange={handleChange}
            required
            style={styles.input}
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            onChange={handleChange}
            required
            style={styles.input}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            onChange={handleChange}
            required
            style={styles.input}
          />
          <button type="submit" style={styles.button}>
            Sign Up
          </button>
        </form>
        <div
          style={styles.linkText}
          onClick={() => navigate("/login")}
        >
          Already have an account? Login
        </div>
        {message && <div style={styles.message}>{message}</div>}
      </div>
    </div>
  );
};

export default Signup;
