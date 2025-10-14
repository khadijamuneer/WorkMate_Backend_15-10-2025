
import React, { useState } from "react";
import axios from "axios";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Step 1: Login request
      const res = await axios.post("http://127.0.0.1:8000/login", formData);
      const token = res.data.access_token;

      // Step 2: Save token and email in local storage
      localStorage.setItem("token", token);
      localStorage.setItem("email", formData.email);
      setMessage("Login successful!");

      // Step 3: Check if profile exists
      try {
        const profileRes = await axios.get(
          `http://127.0.0.1:8000/profile/${formData.email}`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (profileRes.status === 200) {
          // ✅ Profile exists → redirect to profile page
          window.location.href = "/profile";
        }
      } catch (error) {
        // ❌ Profile not found → redirect to create/edit page
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

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          required
        />
        <button type="submit">Login</button>
      </form>
      <p>{message}</p>
    </div>
  );
};

export default Login;