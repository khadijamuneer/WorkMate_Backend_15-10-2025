
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("email"); // assuming you saved this after login

      if (!token || !email) {
        setMessage("Please login first.");
        return;
      }

      try {
        const res = await axios.get(`http://127.0.0.1:8000/profile/${email}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setProfile(res.data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Profile not found → redirect to edit profile
          navigate("/edit_profile");
        } else {
          setMessage("Error fetching profile or token expired.");
          console.error(err);
        }
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setProfile(null);
    setMessage("Logged out successfully.");
  };

  const handleEdit = () => {
    navigate("/edit-profile");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>User Profile</h2>
      {message && <p>{message}</p>}

      {profile ? (
        <div style={{ marginTop: "1rem" }}>
          <h3>Personal Information</h3>
          <p><strong>Name:</strong> {profile.personal_info?.name}</p>
          <p><strong>Email:</strong> {profile.personal_info?.email}</p>
          <p><strong>Phone:</strong> {profile.personal_info?.phone}</p>
          <p><strong>Location:</strong> {profile.personal_info?.location}</p>
          <p><strong>LinkedIn:</strong> {profile.personal_info?.linkedin}</p>
          <p><strong>GitHub:</strong> {profile.personal_info?.github}</p>

          <h3>Skills</h3>
          <ul>
            {profile.skills?.map((skill, index) => (
              <li key={index}>{skill}</li>
            ))}
          </ul>

          <h3>Education</h3>
          <ul>
            {profile.education?.map((edu, index) => (
              <li key={index}>
                {edu.degree} at {edu.school} ({edu.years})
              </li>
            ))}
          </ul>

          <h3>Experience</h3>
          <ul>
            {profile.work?.map((job, index) => (
              <li key={index}>
                {job.title} at {job.company} ({job.dates})
                {job.desc?.length>0 && (
                  <ul>
                    {job.desc.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <h3>Projects</h3>
          <ul>
            {profile.projects?.map((proj, index) => (
              <li key={index}>
                <strong>{proj.title}:</strong>
                <ul>
                  {proj.desc?.map((d,i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <button onClick={handleEdit} style={{ marginRight: "1rem" }}>
            Edit Profile
          </button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        !message && <p>Loading profile...</p>
      )}
    </div>
  );
};

export default Profile;
