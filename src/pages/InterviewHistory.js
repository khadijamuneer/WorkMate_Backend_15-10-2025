import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

const InterviewHistory = () => {
  const [data, setData] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/video-interview/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(d => setData(d.results || []));
  }, []);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ padding: "2rem", width: "100%" }}>
        <h2>Interview History</h2>

        {data.map((item) => (
          <div key={item.id}
            style={{
              border: "1px solid #eee",
              padding: "1rem",
              marginBottom: "1rem",
              borderRadius: "10px",
              cursor: "pointer"
            }}
            onClick={() => navigate(`/interview/${item.id}`)}
          >
            <h3>{item.job_title}</h3>
            <p>{item.job_company}</p>
            <p>Score: {item.overall_score}</p>
            <p>{new Date(item.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InterviewHistory;