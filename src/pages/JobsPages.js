import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const COUNTRIES = [
  "All Countries", "United States", "United Kingdom", "Canada",
  "Australia", "Germany", "France", "Netherlands", "Singapore",
  "UAE", "Pakistan", "India", "Remote",
];

const JOB_TYPES = ["All Types", "Full-time", "Part-time", "Contract", "Internship", "Remote"];

// ── Circular match score ──────────────────────────────────────────────────────
const CircularProgress = ({ percentage }) => {
  const radius = 22, stroke = 4;
  const norm = radius - stroke * 2;
  const circ = norm * 2 * Math.PI;
  const offset = circ - (percentage / 100) * circ;
  const color = percentage >= 70 ? "#10b981" : percentage >= 45 ? "#3b4bff" : "#f59e0b";
  return (
    <svg height={radius * 2} width={radius * 2}>
      <circle stroke="#f3f4f6" fill="transparent" strokeWidth={stroke} r={norm} cx={radius} cy={radius} />
      <circle stroke={color} fill="transparent" strokeWidth={stroke} strokeLinecap="round"
        r={norm} cx={radius} cy={radius}
        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={offset}
        transform={`rotate(-90 ${radius} ${radius})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize="9" fontWeight="700" fill={color}>{Math.round(percentage)}%</text>
    </svg>
  );
};

const formatDate = (isoDate) => {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    const diff = Math.floor((new Date() - d) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return isoDate; }
};

// ── Reusable button ───────────────────────────────────────────────────────────
const Btn = ({ onClick, bg, color, children }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        padding: "0.45rem 0.85rem", borderRadius: "10px", border: "none",
        cursor: "pointer", fontSize: "0.8rem", fontWeight: "600",
        fontFamily: "inherit", background: bg, color,
        opacity: hov ? 0.85 : 1, transition: "opacity 0.15s",
      }}
    >{children}</button>
  );
};

// ── Job card ──────────────────────────────────────────────────────────────────
const JobCard = ({ job, idx, navigate }) => {
  const [expanded, setExpanded] = useState(false);
  const [hov, setHov] = useState(false);
  const desc = job.preview_desc || job.description || "";
  const short = desc.length > 150 ? desc.slice(0, 150) + "…" : desc;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: "16px", padding: "1.4rem 1.5rem",
        border: "1px solid #ebebf0", position: "relative", display: "flex",
        flexDirection: "column", gap: "0.5rem",
        boxShadow: hov ? "0 8px 28px rgba(59,75,255,0.12)" : "0 2px 8px rgba(0,0,0,0.05)",
        transform: hov ? "translateY(-2px)" : "none",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
    >
      {/* Score */}
      {job.score > 0 && (
        <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
          <CircularProgress percentage={job.score * 100} />
        </div>
      )}

      {/* Title + company */}
      <div style={{ paddingRight: "3.5rem" }}>
        <div style={{ fontSize: "1.05rem", fontWeight: "700", color: "#111827" }}>{job.title}</div>
        <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#6b7280", marginTop: "2px" }}>{job.company}</div>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {job.location && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", background: "#f0f2ff", color: "#3b4bff", fontSize: "0.72rem", fontWeight: "600", padding: "3px 9px", borderRadius: "6px" }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {job.location}
          </span>
        )}
        {job.date_posted && (
          <span style={{ background: "#f9fafb", color: "#9ca3af", fontSize: "0.72rem", fontWeight: "600", padding: "3px 9px", borderRadius: "6px" }}>
            {formatDate(job.date_posted)}
          </span>
        )}
      </div>

      {/* Description */}
      <div style={{ fontSize: "0.85rem", color: "#4b5563", lineHeight: "1.65" }}>
        {expanded ? desc : short}
        {desc.length > 150 && (
          <button onClick={() => setExpanded(!expanded)}
            style={{ color: "#3b4bff", fontSize: "0.8rem", fontWeight: "600", background: "none", border: "none", cursor: "pointer", padding: "0 0 0 4px", fontFamily: "inherit" }}>
            {expanded ? "less" : "more"}
          </button>
        )}
      </div>

      {/* Skill tags */}
      {job.skills?.length > 0 && (
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          {job.skills.slice(0, 5).map((s, i) => (
            <span key={i} style={{ background: "#f0f2ff", color: "#3b4bff", fontSize: "0.7rem", fontWeight: "600", padding: "2px 8px", borderRadius: "6px" }}>{s}</span>
          ))}
          {job.skills.length > 5 && (
            <span style={{ background: "#f0f2ff", color: "#3b4bff", fontSize: "0.7rem", fontWeight: "600", padding: "2px 8px", borderRadius: "6px" }}>+{job.skills.length - 5}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
        {job.link && (
          <Btn onClick={() => window.open(job.link, "_blank")} bg="#f0f2ff" color="#3b4bff">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View Job
          </Btn>
        )}
        <Btn onClick={() => navigate("/tailor-resume", { state: { job } })} bg="#fffefc" color="rgb(163, 125, 19)">🎯 Tailor Resume</Btn>
        <Btn onClick={() => navigate("/cover-letter", { state: { job } })} bg="#ecfdf5" color="#059669">✉️ Cover Letter</Btn>
        <Btn onClick={() => navigate("/interview", { state: { job } })} bg="#f5f3ff" color="#7c3aed">💬 Interview Prep</Btn>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const JobsPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingMatched, setViewingMatched] = useState(true);
  const [sortBy, setSortBy] = useState("best_match");
  const [selectedCountry, setSelectedCountry] = useState("All Countries");
  const [selectedType, setSelectedType] = useState("All Types");
  const [showFilters, setShowFilters] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const fetchMatchedJobs = async () => {
      const email = localStorage.getItem("email");
      if (!email) return;
      setLoading(true);
      try {
        const res = await axios.get(
          `http://localhost:8000/jobs/match?email=${encodeURIComponent(email)}&sort_by=${encodeURIComponent(sortBy)}`
        );
        let fetched = res.data.jobs || [];
        if (sortBy === "date") {
          fetched = fetched.slice().sort((a, b) => new Date(b.date_posted) - new Date(a.date_posted));
        }
        setJobs(fetched.map(j => ({ ...j, score: Math.min(Math.max(j.score ?? 0, 0), 1) })));
        setViewingMatched(true);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    if (viewingMatched) fetchMatchedJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, viewingMatched]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setJobs([]);
    try {
      const res = await axios.get(`http://localhost:8000/jobs/search?query=${encodeURIComponent(query)}`);
      let searched = (res.data.jobs || [])
        .slice().sort((a, b) => new Date(b.date_posted) - new Date(a.date_posted))
        .map(j => ({ ...j, score: 0 }));
      setJobs(searched);
      setViewingMatched(false);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredJobs = useMemo(() => jobs.filter(job => {
    const loc = (job.location || "").toLowerCase();
    const countryOk = selectedCountry === "All Countries" || loc.includes(selectedCountry.toLowerCase());
    const typeOk = selectedType === "All Types" ||
      (job.title + " " + (job.full_desc || "")).toLowerCase().includes(selectedType.toLowerCase());
    return countryOk && typeOk;
  }), [jobs, selectedCountry, selectedType]);

  const activeFilters = [selectedCountry !== "All Countries", selectedType !== "All Types"].filter(Boolean).length;

  const S = {
    layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f5f6fa", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" },
    main: { flex: 1, padding: "2.5rem 3rem", minWidth: 0 },
    headingRow: { marginBottom: "1.75rem" },
    h1: { fontSize: "1.875rem", fontWeight: "700", color: "#111827", margin: 0 },
    subtitle: { color: "#9ca3af", fontSize: "0.875rem", marginTop: "0.25rem", marginBottom: 0 },
    searchRow: { display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center" },
    searchWrap: { flex: 1, position: "relative" },
    searchInput: {
      width: "100%", padding: "0.7rem 1rem 0.7rem 2.75rem",
      borderRadius: "12px", border: `1.5px solid ${searchFocused ? "#3b4bff" : "#e5e7eb"}`,
      fontSize: "0.9rem", fontFamily: "inherit", background: "#fff",
      boxSizing: "border-box", outline: "none",
      boxShadow: searchFocused ? "0 0 0 3px rgba(59,75,255,0.1)" : "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
    },
    searchIcon: { position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" },
    btnSearch: { padding: "0.7rem 1.5rem", background: "#3b4bff", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "600", fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
    btnFilter: (active) => ({
      padding: "0.7rem 1rem", background: active ? "#3b4bff" : "#fff",
      color: active ? "#fff" : "#374151",
      border: `1.5px solid ${active ? "#3b4bff" : "#e5e7eb"}`,
      borderRadius: "12px", fontWeight: "600", fontSize: "0.875rem",
      cursor: "pointer", fontFamily: "inherit",
      display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap",
    }),
    btnMatches: { padding: "0.7rem 1rem", background: "#f0f2ff", color: "#3b4bff", border: "none", borderRadius: "12px", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
    filterPanel: { background: "#fff", border: "1px solid #ebebf0", borderRadius: "14px", padding: "1.25rem 1.5rem", marginBottom: "1.25rem", display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-end" },
    filterLabel: { display: "block", fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" },
    filterSelect: { padding: "0.5rem 0.75rem", borderRadius: "10px", border: "1.5px solid #e5e7eb", background: "#f9faff", fontSize: "0.875rem", fontFamily: "inherit", color: "#374151", cursor: "pointer", outline: "none" },
    sortRow: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem", alignItems: "center" },
    sortLabel: { fontSize: "0.72rem", color: "#9ca3af", fontWeight: "700", letterSpacing: "0.07em", marginRight: "0.25rem" },
    pill: (active) => ({ padding: "0.45rem 1.1rem", borderRadius: "9999px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", border: active ? "none" : "1.5px solid #3b4bff", background: active ? "#3b4bff" : "#fff", color: active ? "#fff" : "#3b4bff" }),
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))", gap: "1.25rem" },
    empty: { textAlign: "center", marginTop: "4rem", color: "#9ca3af" },
    loadWrap: { display: "flex", justifyContent: "center", alignItems: "center", marginTop: "4rem", gap: "1rem" },
    spinner: { width: "2rem", height: "2rem", border: "3px solid #e0e7ff", borderTop: "3px solid #3b4bff", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  };

  return (
    <div style={S.layout}>
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      <Sidebar />
      <div style={S.main}>

        {/* Heading */}
        <div style={S.headingRow}>
          <h1 style={S.h1}>{viewingMatched ? "Recommended for You" : `Results for "${query}"`}</h1>
          {!loading && <p style={S.subtitle}>{filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""} found{activeFilters > 0 ? ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} active` : ""}</p>}
        </div>

        {/* Search row */}
        <form style={S.searchRow} onSubmit={handleSearch}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              style={S.searchInput}
              type="text"
              placeholder="Search jobs by title, skill, or company…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
          <button type="submit" style={S.btnSearch}>Search</button>
          <button type="button" style={S.btnFilter(showFilters)} onClick={() => setShowFilters(!showFilters)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
            Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </button>
          {!viewingMatched && (
            <button type="button" style={S.btnMatches} onClick={() => { setViewingMatched(true); setQuery(""); }}>✦ My Matches</button>
          )}
        </form>

        {/* Filter panel */}
        {showFilters && (
          <div style={S.filterPanel}>
            <div>
              <label style={S.filterLabel}>Country / Region</label>
              <select style={S.filterSelect} value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.filterLabel}>Job Type</label>
              <select style={S.filterSelect} value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {activeFilters > 0 && (
              <button onClick={() => { setSelectedCountry("All Countries"); setSelectedType("All Types"); }}
                style={{ padding: "0.5rem 1rem", background: "#fff1f2", color: "#ef4444", border: "none", borderRadius: "10px", fontWeight: "600", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit" }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Sort pills */}
        {viewingMatched && !loading && (
          <div style={S.sortRow}>
            <span style={S.sortLabel}>SORT</span>
            <button style={S.pill(sortBy === "best_match")} onClick={() => setSortBy("best_match")}>Best Match</button>
            <button style={S.pill(sortBy === "date")} onClick={() => setSortBy("date")}>Date Posted</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={S.loadWrap}>
            <div style={S.spinner} />
            <p style={{ color: "#6b7280", margin: 0 }}>{viewingMatched ? "Finding your best matches…" : "Searching jobs…"}</p>
          </div>
        )}

        {/* Jobs grid */}
        {!loading && filteredJobs.length > 0 && (
          <div style={S.grid}>
            {filteredJobs.map((job, idx) => <JobCard key={idx} job={job} idx={idx} navigate={navigate} />)}
          </div>
        )}

        {/* No results after filter */}
        {!loading && filteredJobs.length === 0 && jobs.length > 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: "2rem" }}>🔍</div>
            <p>No jobs match your current filters.</p>
            <button onClick={() => { setSelectedCountry("All Countries"); setSelectedType("All Types"); }}
              style={{ padding: "0.5rem 1.25rem", background: "#3b4bff", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
              Clear Filters
            </button>
          </div>
        )}

        {/* No jobs at all */}
        {!loading && jobs.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: "2rem" }}>✦</div>
            <p>{viewingMatched ? "No matched jobs available yet." : "No jobs found. Try a different search."}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default JobsPage;
