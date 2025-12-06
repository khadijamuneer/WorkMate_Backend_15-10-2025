import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const JobsPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingMatched, setViewingMatched] = useState(true);
  const [sortBy, setSortBy] = useState("best_match"); // "best_match" or "date"

  // Fetch matched jobs when component mounts and whenever sortBy changes (when viewing matched)
  useEffect(() => {
    const fetchMatchedJobs = async (sortOption = sortBy) => {
      const email = localStorage.getItem("email");
      if (!email) return;

      setLoading(true);
      try {
        const res = await axios.get(
          `http://localhost:8000/jobs/match?email=${encodeURIComponent(email)}&sort_by=${encodeURIComponent(sortOption)}`
        );
        let fetched = res.data.jobs || [];

        // final safety sort in frontend (newest first) when sortBy === "date"
        if (sortOption === "date") {
          fetched = fetched.slice().sort((a, b) => new Date(b.date_posted) - new Date(a.date_posted));
        }

        setJobs(fetched);
        setViewingMatched(true);
      } catch (err) {
        console.error("Error fetching matched jobs:", err);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch matched if we are in the matched view
    if (viewingMatched) fetchMatchedJobs(sortBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, viewingMatched]);

  // Search handler (search results are sorted by date on backend / double-sorted here)
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setJobs([]);

    try {
      const res = await axios.get(
        `http://localhost:8000/jobs/search?query=${encodeURIComponent(query)}`
      );
      let searched = res.data.jobs || [];
      // safety sort newest first
      searched = searched.slice().sort((a, b) => new Date(b.date_posted) - new Date(a.date_posted));
      setJobs(searched);
      setViewingMatched(false);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTailorResume = (job) => {
    navigate("/tailor-resume", { state: { job } });
  };

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

  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return isoDate;
    }
  };

  const styles = {
    layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8f9fb" },
    main: { flex: 1, padding: "3rem 4rem" },
    title: {
      textAlign: "center",
      fontSize: "2.25rem",
      fontWeight: "700",
      color: "#3b4bff",
      marginBottom: "2rem",
    },
    searchForm: { display: "flex", justifyContent: "center", marginBottom: "2rem" },
    searchInput: { 
      width: "60%", 
      padding: "0.5rem 1rem", 
      borderRadius: "8px 0 0 8px", 
      border: "1px solid #ccc", 
      outline: "none" 
    },
    searchButton: { 
      backgroundColor: "#3b4bff", 
      color: "#fff", 
      padding: "0.5rem 1.5rem", 
      borderRadius: "0 8px 8px 0", 
      border: "none", 
      cursor: "pointer", 
      fontWeight: "600" 
    },
    sortButtons: { display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "2rem" },
    pill: (active) => ({ 
      padding: "0.5rem 1.25rem", 
      borderRadius: "9999px", 
      border: active ? "none" : "1px solid #3b4bff", 
      backgroundColor: active ? "#3b4bff" : "#fff", 
      color: active ? "#fff" : "#3b4bff", 
      fontWeight: "600", 
      cursor: "pointer", 
      transition: "0.2s" 
    }),
    jobsGrid: { 
      display: "flex", 
      flexWrap: "wrap", 
      gap: "2rem", 
      justifyContent: "flex-start" 
    },
    card: { 
      position: "relative", 
      flex: "1 1 48%", 
      backgroundColor: "#fff", 
      borderRadius: "16px", 
      padding: "1.5rem", 
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)", 
      border: "1px solid #e5e7eb" 
    },
    jobTitle: { 
      fontSize: "1.25rem", 
      fontWeight: "700", 
      color: "#3b4bff", 
      marginBottom: "0.25rem" 
    },
    company: { 
      fontWeight: "600", 
      marginBottom: "0.25rem" 
    },
    locationBadge: { 
      display: "inline-block", 
      backgroundColor: "#e0e7ff", 
      color: "#3b4bff", 
      fontSize: "0.75rem", 
      fontWeight: "600", 
      padding: "2px 8px", 
      borderRadius: "12px", 
      marginBottom: "0.5rem" 
    },
    description: { 
      color: "#4b5563", 
      marginBottom: "0.5rem" 
    },
    dateSkills: { 
      fontSize: "0.875rem", 
      color: "#6b7280", 
      marginBottom: "0.5rem" 
    },
    buttonRow: {
      display: "flex",
      gap: "0.75rem",
      marginTop: "1rem",
      flexWrap: "wrap"
    },
    viewBtn: { 
      backgroundColor: "#3b4bff", 
      color: "#fff", 
      padding: "0.5rem 1rem", 
      borderRadius: "12px", 
      border: "none", 
      cursor: "pointer", 
      fontWeight: "600",
      fontSize: "0.875rem",
      transition: "all 0.2s"
    },
    tailorBtn: {
      backgroundColor: "#3b4bff",
      color: "#fff",
      padding: "0.5rem 1rem",
      borderRadius: "12px",
      border: "none",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "0.875rem",
      transition: "all 0.2s"
    },
    scoreBadge: { 
      position: "absolute", 
      top: "1rem", 
      right: "1rem", 
      width: "50px", 
      height: "50px" 
    },
    loadingContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      marginTop: "3rem"
    },
    spinner: {
      width: "3rem",
      height: "3rem",
      border: "4px solid #3b4bff",
      borderTop: "4px solid transparent",
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    },
    loadingText: {
      marginLeft: "1rem",
      fontSize: "1.125rem",
      color: "#6b7280"
    },
    noJobsText: {
      textAlign: "center",
      color: "#6b7280",
      marginTop: "2rem",
      fontSize: "1.125rem"
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        
        <h1 style={styles.title}>
          {viewingMatched ? "Recommended Jobs for You" : "Job Search"}
        </h1>

        <form style={styles.searchForm} onSubmit={handleSearch}>
          <input 
            type="text" 
            placeholder="Search for jobs (e.g. Data Scientist, UI Designer)" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            style={styles.searchInput} 
          />
          <button type="submit" style={styles.searchButton}>
            Search
          </button>
        </form>

        {viewingMatched && (
          <div style={styles.sortButtons}>
            <button 
              style={styles.pill(sortBy === "best_match")} 
              onClick={() => setSortBy("best_match")}
            >
              Best Match
            </button>
            <button 
              style={styles.pill(sortBy === "date")} 
              onClick={() => setSortBy("date")}
            >
              Date Posted
            </button>
          </div>
        )}

        {loading && (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>
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
                
                {job.location && (
                  <div style={styles.locationBadge}>{job.location}</div>
                )}
                
                <div style={styles.description}>
                  {job.preview_desc || job.description || "No description available."}
                </div>
                
                <div style={styles.dateSkills}>
                  {job.date_posted && (
                    <span>Date Posted: {formatDate(job.date_posted)} · </span>
                  )}
                  {job.skills && job.skills.length > 0 && (
                    <span>Skills: {job.skills.join(", ")}</span>
                  )}
                </div>
                
                <div style={styles.buttonRow}>
                  {job.link && (
                    <button 
                      style={styles.viewBtn} 
                      onClick={() => window.open(job.link, "_blank")}
                      onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                      onMouseLeave={(e) => e.target.style.opacity = "1"}
                    >
                      View Job
                    </button>
                  )}
                  
                  <button 
                    style={styles.tailorBtn}
                    onClick={() => handleTailorResume(job)}
                    onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                    onMouseLeave={(e) => e.target.style.opacity = "1"}
                  >
                    🎯 Tailor Resume
                  </button>

                  <button
                    style={{...styles.tailorBtn,backgroundColor:"#3b4bff",}}  
                    onClick={() =>navigate("/interview",{state:{job},})}>
                     💬 Prepare Interview
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <p style={styles.noJobsText}>
            {viewingMatched 
              ? "No matched jobs available yet." 
              : "No jobs to display. Try searching above!"}
          </p>
        )}
      </div>
    </div>
  );
};

export default JobsPage;
