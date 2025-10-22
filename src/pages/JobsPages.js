import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const JobsPage = () => {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingMatched, setViewingMatched] = useState(true);

  // Fetch matched jobs for the logged-in user
  useEffect(() => {
    const fetchMatchedJobs = async () => {
      const email = localStorage.getItem("email");
      if (!email) return;

      setLoading(true);
      try {
        const res = await axios.get(
          `http://localhost:8000/jobs/match?email=${encodeURIComponent(email)}`
        );
        setJobs(res.data.jobs);
        setViewingMatched(true);
      } catch (err) {
        console.error("Error fetching matched jobs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchedJobs();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setJobs([]);

    try {
      const res = await axios.get(
        `http://localhost:8000/jobs/search?query=${encodeURIComponent(query)}`
      );
      setJobs(res.data.jobs);
      setViewingMatched(false);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Circular progress component for match score
  const CircularProgress = ({ percentage }) => {
    const radius = 22;
    const stroke = 4;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#e0e7ff"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#3b4bff"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="10"
          fontWeight="600"
          fill="#3b4bff"
        >
          {Math.round(percentage)}%
        </text>
      </svg>
    );
  };

  const styles = {
    layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8f9fb" },
    main: { flex: 1, padding: "3rem 4rem" },
    title: { textAlign: "center", fontSize: "2.25rem", fontWeight: "700", color: "#3b4bff", marginBottom: "2rem" },
    searchForm: { display: "flex", justifyContent: "center", marginBottom: "2rem" },
    searchInput: { width: "60%", padding: "0.5rem 1rem", borderRadius: "8px 0 0 8px", border: "1px solid #ccc", outline: "none" },
    searchButton: { backgroundColor: "#3b4bff", color: "#fff", padding: "0.5rem 1.5rem", borderRadius: "0 8px 8px 0", border: "none", cursor: "pointer", fontWeight: "600" },
    jobsGrid: { display: "flex", flexWrap: "wrap", gap: "2rem", justifyContent: "flex-start" },
    card: { position: "relative", flex: "1 1 48%", backgroundColor: "#fff", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" },
    jobTitle: { fontSize: "1.25rem", fontWeight: "700", color: "#3b4bff", marginBottom: "0.25rem" },
    company: { fontWeight: "600", marginBottom: "0.25rem" },
    locationBadge: { display: "inline-block", backgroundColor: "#e0e7ff", color: "#3b4bff", fontSize: "0.75rem", fontWeight: "600", padding: "2px 8px", borderRadius: "12px", marginBottom: "0.5rem" },
    description: { color: "#4b5563", marginBottom: "0.5rem" },
    dateSkills: { fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" },
    skills: { fontSize: "0.9rem", color: "#374151", marginBottom: "1rem" },
    viewBtn: { backgroundColor: "#3b4bff", color: "#fff", padding: "0.5rem 1rem", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: "600" },
    scoreBadge: { position: "absolute", top: "1rem", right: "1rem", width: "50px", height: "50px" },
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <h1 style={styles.title}>{viewingMatched ? "Recommended Jobs for You" : "Job Search"}</h1>

        <form style={styles.searchForm} onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search for jobs (e.g. Data Scientist, UI Designer)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchButton}>Search</button>
        </form>

        {loading && (
          <div className="flex justify-center items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="ml-4 text-lg text-gray-600">
              {viewingMatched ? "Fetching matched jobs..." : "Scraping jobs, please wait..."}
            </p>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <div style={styles.jobsGrid}>
            {jobs.map((job, idx) => (
              <div key={idx} style={styles.card}>
                {job.score !== undefined && (
                  <div style={styles.scoreBadge}>
                    <CircularProgress percentage={job.score * 100} />
                  </div>
                )}
                <div style={styles.jobTitle}>{job.title}</div>
                <div style={styles.company}>{job.company}</div>

                {/* 🔹 Location badge */}
                {job.location && <div style={styles.locationBadge}>{job.location}</div>}

                <div style={styles.description}>{job.preview_desc || job.description || "No description available."}</div>
                <div style={styles.dateSkills}>
                  {job.date_posted && <span>Date Posted: {job.date_posted} · </span>}
                  {job.skills && job.skills.length > 0 && <span>Skills: {job.skills.join(", ")}</span>}
                </div>
                {job.link && (
                  <button style={styles.viewBtn} onClick={() => window.open(job.link, "_blank")}>
                    View Job
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <p style={{ textAlign: "center", color: "#6b7280", marginTop: "2rem" }}>
            {viewingMatched ? "No matched jobs available yet." : "No jobs to display. Try searching above!"}
          </p>
        )}
      </div>
    </div>
  );
};

export default JobsPage;