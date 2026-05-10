import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const API = "http://127.0.0.1:8000";

// ── helpers ────────────────────────────────────────────────────────────────

const scoreColor = (score) => {
  if (score >= 75) return "#3b4bff";
  if (score >= 45) return "#f59e0b";
  return "#9ca3af";
};

// ── reusable components ─────────────────────────────────────────────────────

const SectionHeader = ({ title }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", marginTop: "0.25rem" }}>
    <h3 style={{ margin: 0, fontSize: "0.8rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {title}
    </h3>
    <div style={{ flex: 1, height: "1px", background: "#f3f4f6" }} />
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #ebebf0",
    padding: "1.5rem 2rem",
    marginBottom: "1.25rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    ...style,
  }}>
    {children}
  </div>
);

const Skeleton = ({ height = 18, width = "100%", style = {} }) => (
  <div style={{
    height, width,
    background: "linear-gradient(90deg,#f3f4f6 25%,#e9eaf0 50%,#f3f4f6 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.4s infinite",
    borderRadius: "8px",
    ...style,
  }} />
);

const StrengthRing = ({ score }) => {
  const r = 44, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition: "stroke-dasharray 0.9s ease" }}
        />
        <text x="55" y="50" textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">{score}</text>
        <text x="55" y="67" textAnchor="middle" fontSize="10" fill="#9ca3af">/ 100</text>
      </svg>
      <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Employability score
      </span>
    </div>
  );
};

// ── Section 1: Trending Skills ──────────────────────────────────────────────

const TrendingSection = () => {
  const [role, setRole] = useState("software engineer");
  const [input, setInput] = useState("software engineer");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/skills/trending`, { params: { role: r } });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(role); }, [role, load]);

  const handleSearch = () => { setRole(input); };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <SectionHeader title="Trending Skills" />
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. data scientist"
            style={{
              border: "1px solid #ebebf0", borderRadius: "10px",
              padding: "7px 13px", fontSize: "0.85rem", outline: "none",
              fontFamily: "'DM Sans','Segoe UI',sans-serif", width: "190px",
              color: "#111827",
            }}
          />
          <button onClick={handleSearch} style={{
            background: "#3b4bff", color: "#fff", border: "none",
            borderRadius: "10px", padding: "7px 16px", fontSize: "0.85rem",
            fontWeight: "600", cursor: "pointer", fontFamily: "inherit",
          }}>
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} height={32} width={`${90 + i * 10}px`} style={{ borderRadius: "8px" }} />
          ))}
        </div>
      ) : !data ? (
        <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Could not load data. Check your API connection.</p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {data.skills.slice(0, 20).map((s) => (
              <span key={s.skill} style={{
                display: "inline-flex", alignItems: "center",
                background: "#f0f2ff", color: "#3b4bff",
                fontSize: "0.78rem", fontWeight: "600",
                padding: "6px 13px", borderRadius: "8px",
                border: "1px solid #e0e7ff",
              }}>
                {s.skill}
              </span>
            ))}
          </div>

          <p style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#9ca3af" }}>
            {(data.meta?.db_postings_analyzed || 0).toLocaleString()} job postings analysed · {data.meta?.esco_skills_found || 0} ESCO skills mapped
          </p>
        </>
      )}
    </Card>
  );
};

// ── Section 2: Skill Gaps ───────────────────────────────────────────────────

const GapSection = ({ token, gapsRef }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleInput, setRoleInput] = useState("");

  const load = useCallback(async (override = "") => {
    setLoading(true);
    try {
      const params = override ? { target_role_override: override } : {};
      const res = await axios.get(`${API}/skills/gaps`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setData(res.data);
      if (gapsRef) gapsRef.current = res.data?.gaps?.map((g) => g.skill) || [];
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, gapsRef]);

  useEffect(() => { load(); }, [load]);

  const handleRoleSearch = () => { load(roleInput); };

  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        marginBottom: "1rem", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "500" }}>
          Analyse gaps for:
        </span>
        <input
          value={roleInput}
          onChange={(e) => setRoleInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRoleSearch()}
          placeholder={data?.target_role || "e.g. data scientist"}
          style={{
            border: "1px solid #ebebf0", borderRadius: "10px",
            padding: "7px 13px", fontSize: "0.85rem", outline: "none",
            fontFamily: "'DM Sans','Segoe UI',sans-serif", width: "200px",
            color: "#111827",
          }}
        />
        <button
          onClick={handleRoleSearch}
          style={{
            background: "#3b4bff", color: "#fff", border: "none",
            borderRadius: "10px", padding: "7px 16px", fontSize: "0.85rem",
            fontWeight: "600", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Analyse
        </button>
        {data?.target_role && (
          <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
            Currently: <strong style={{ color: "#374151" }}>{data.target_role}</strong>
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
        <Card style={{ margin: 0 }}>
          <SectionHeader title="Your Skill Coverage" />
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <Skeleton height={110} width={110} style={{ borderRadius: "50%" }} />
              <Skeleton height={16} width="60%" />
            </div>
          ) : !data ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Complete your profile to see your score.</p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
                <StrengthRing score={data.strength_score} />
              </div>
              <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>
                Skills you already have
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {data.matched?.length === 0 ? (
                  <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>None matched yet — add more skills to your profile.</span>
                ) : (
                  data.matched?.map((s) => (
                    <span key={s.skill} style={{
                      background: "#f0fdf4", color: "#16a34a",
                      fontSize: "0.78rem", fontWeight: "600",
                      padding: "4px 11px", borderRadius: "8px",
                    }}>
                      ✓ {s.skill}
                    </span>
                  ))
                )}
              </div>
            </>
          )}
        </Card>

        <Card style={{ margin: 0 }}>
          <SectionHeader title="Top Skill Gaps" />
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[...Array(6)].map((_, i) => <Skeleton key={i} height={40} />)}
            </div>
          ) : !data ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No data available.</p>
          ) : data.gaps?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "#16a34a", fontSize: "0.95rem", fontWeight: "600" }}>
              🎉 No major gaps — you're well-covered!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.gaps.map((gap, i) => (
                <div key={gap.skill} style={{
                  display: "flex", alignItems: "center",
                  background: "#f8f9ff", border: "1px solid #e0e7ff",
                  borderRadius: "10px", padding: "9px 14px",
                }}>
                  <span style={{
                    width: "20px", height: "20px", borderRadius: "50%",
                    background: "#3b4bff", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.7rem", fontWeight: "700", flexShrink: 0,
                    marginRight: "10px",
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>{gap.skill}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

// ── Section 3: Learning Roadmap ─────────────────────────────────────────────

const RoadmapSection = ({ token, gapsRef }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const gaps = gapsRef?.current || [];
      const res = await axios.post(
        `${API}/skills/recommend`,
        { skill_gaps: gaps },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setResult(res.data);
    } catch {
      setError("Failed to generate roadmap. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (text) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) return <h4 key={i} style={{ margin: "0.75rem 0 0.25rem", fontSize: "0.9rem", color: "#111827", fontWeight: "700" }}>{line.slice(4)}</h4>;
      if (line.startsWith("## "))  return <h3 key={i} style={{ margin: "0.75rem 0 0.25rem", fontSize: "1rem",  color: "#111827", fontWeight: "700" }}>{line.slice(3)}</h3>;
      if (line.startsWith("**") && line.endsWith("**")) return <p key={i} style={{ margin: "6px 0", fontSize: "0.875rem", fontWeight: "700", color: "#111827" }}>{line.slice(2, -2)}</p>;
      if (line.startsWith("- ") || line.startsWith("* ")) return (
        <div key={i} style={{ display: "flex", gap: "8px", margin: "3px 0" }}>
          <span style={{ color: "#3b4bff", fontSize: "0.9rem", flexShrink: 0 }}>•</span>
          <span style={{ fontSize: "0.875rem", color: "#4b5563", lineHeight: "1.6" }}>{line.slice(2)}</span>
        </div>
      );
      if (line.trim() === "") return <div key={i} style={{ height: "6px" }} />;
      return <p key={i} style={{ margin: "4px 0", fontSize: "0.875rem", color: "#4b5563", lineHeight: "1.6" }}>{line}</p>;
    });
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <SectionHeader title="Learning Roadmap" />
        <button
          onClick={generate}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "0.5rem 1.1rem",
            background: loading ? "#f3f4f6" : "#f0f2ff",
            color: loading ? "#9ca3af" : "#3b4bff",
            border: "none", borderRadius: "10px",
            fontWeight: "600", fontSize: "0.85rem",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans','Segoe UI',sans-serif",
          }}
        >
          {loading ? (
            <>
              <div style={{ width: "14px", height: "14px", border: "2px solid #e0e7ff", borderTop: "2px solid #3b4bff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              Generating…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              {result ? "Regenerate Learning Roadmap" : "Generate Learning Roadmap"}
            </>
          )}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fff1f2", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: "10px", fontSize: "0.875rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{
          background: "#f8f9ff", border: "1px dashed #c7d2fe",
          borderRadius: "12px", padding: "2rem", textAlign: "center",
        }}>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af", margin: 0 }}>
            Click <strong style={{ color: "#3b4bff" }}>Generate Learning Roadmap</strong> to get a personalised learning plan based on your skill gaps.
          </p>
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[100, 90, 80, 95, 70].map((w, i) => <Skeleton key={i} height={16} width={`${w}%`} />)}
        </div>
      )}

      {result && (
        <>
          <div style={{
            background: "#f8f9ff", border: "1px solid #e0e7ff",
            borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1.25rem",
          }}>
            {renderMarkdown(result.roadmap)}
          </div>

          {result.suggested_courses?.length > 0 && (
            <>
              <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>
                Suggested courses
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {result.suggested_courses.map((c) => (
                  <button
                    key={c.url}
                    onClick={() => window.open(c.url, "_blank")}
                    style={{
                      display: "flex", alignItems: "center", gap: "7px",
                      background: "#fff", border: "1px solid #ebebf0",
                      borderRadius: "10px", padding: "8px 14px",
                      fontSize: "0.82rem", fontWeight: "500", color: "#111827",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c7d2fe"; e.currentTarget.style.background = "#f8f9ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ebebf0"; e.currentTarget.style.background = "#fff"; }}
                  >
                    <span style={{ background: "#f0f2ff", color: "#3b4bff", borderRadius: "6px", padding: "2px 7px", fontSize: "0.7rem", fontWeight: "700" }}>
                      {c.platform}
                    </span>
                    {c.title}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
};

// ── Root Page ───────────────────────────────────────────────────────────────

const SkillsPage = () => {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const gapsRef = React.useRef([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) { setMessage("Please login first."); return; }
      try {
        const res = await axios.get(`${API}/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
      } catch (err) {
        if (err.response?.status === 404) navigate("/edit-profile");
        else setMessage("Error fetching profile.");
      }
    };
    fetchProfile();
  }, [navigate, token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    navigate("/login");
  };

  if (!profile && !message) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f6fa", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
        <Sidebar profile={null} onLogout={handleLogout} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "#9ca3af" }}>
            <div style={{ width: "2rem", height: "2rem", border: "3px solid #e0e7ff", borderTop: "3px solid #3b4bff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ margin: 0, fontSize: "0.9rem" }}>Loading…</p>
          </div>
          <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f6fa", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes spin    { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
      <Sidebar profile={profile} onLogout={handleLogout} />

      <div style={{ flex: 1, padding: "2.5rem 3rem", maxWidth: "960px" }}>
        {message && (
          <div style={{ background: "#fff1f2", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: "10px", marginBottom: "1rem", fontSize: "0.875rem" }}>
            {message}
          </div>
        )}

        <div style={{
          background: "#fff", borderRadius: "20px", border: "1px solid #ebebf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: "1.5rem",
        }}>
          <div style={{ height: "70px", background: "linear-gradient(120deg,#3b4bff 0%,#7c8cff 60%,#a5b4fc 100%)" }} />
          <div style={{ padding: "1.25rem 2rem 1.5rem" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.4rem", fontWeight: "700", color: "#111827" }}>
              Skills Prediction
            </h2>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Discover trending skills, analyse your gaps, and get a personalised learning roadmap.
            </p>
          </div>
        </div>

        <TrendingSection />
        <GapSection token={token} gapsRef={gapsRef} />
        <RoadmapSection token={token} gapsRef={gapsRef} />
      </div>
    </div>
  );
};

export default SkillsPage;
