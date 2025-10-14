
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
      // Step 1: Sign up user
      const res = await axios.post("http://127.0.0.1:8000/signup", formData);
      setMessage("Signup successful! Redirecting...");

      // Step 2: Immediately log them in to get token
      const loginRes = await axios.post("http://127.0.0.1:8000/login", {
        email: formData.email,
        password: formData.password,
      });

      // Step 3: Store credentials
      localStorage.setItem("token", loginRes.data.access_token);
      localStorage.setItem("email", formData.email);

      // Step 4: Try fetching profile
      try {
        const profileRes = await axios.get(`http://127.0.0.1:8000/profile/${formData.email}`, {
          headers: { Authorization: `Bearer ${loginRes.data.access_token}` },
        });

        // If found → go to profile page
        if (profileRes.data) {
          navigate("/profile");
        }
      } catch {
        // If not found → go to edit profile
        navigate("/edit-profile");
      }

    } catch (err) {
      setMessage(err.response?.data?.detail || "Signup failed");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Name"
          onChange={handleChange}
          required
        />
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
        <button type="submit">Sign Up</button>
      </form>
      <p>{message}</p>
    </div>
  );
};

export default Signup;
