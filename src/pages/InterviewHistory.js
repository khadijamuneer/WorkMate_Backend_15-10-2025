import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

const ScoreRing = ({ score, size = 52 }) => {
  const r    = size / 2 - 5;
  const circ = r * 2 * Math.PI;
  const off  = circ - (score / 100) * circ;
  const c    = score >= 70 ? "#10b981" : score >= 45 ? "#3b4bff" : "#f59e0b";
  return (
    <svg width={size} height={size}>
      <circle stroke="#f3f4f6" fill="transparent" strokeWidth="5" r={r} cx={size/2} cy={size/2} />
      <circle stroke={c} fill="transparent" strokeWidth="5" strokeLinecap="round"
        r={r} cx={size/2} cy={size/2}
        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={off}
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize="10" fontWeight="800" fill={c}>{Math.round(score)}</text>
    </svg>
  );
};

const Badge = ({ label, color, bg }) => (
  <span style={{ fontSize: "0.7rem", fontWeight: "700", padding: "2px 8px",
    borderRadius: "6px", background: bg, color, whiteSpace: "nowrap" }}>
    {label}
  </span>
);

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const fmtDur = (sec) => {
  if (!sec) return "";
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}m ${s}s`;
};

const scoreColor = (s) => s >= 70 ? "#10b981" : s >= 45 ? "#3b4bff" : "#f59e0b";
const scoreBg    = (s) => s >= 70 ? "#ecfdf5" : s >= 45 ? "#f0f2ff" : "#fffbeb";
const scoreLabel = (s) => s >= 75 ? "Excellent" : s >= 60 ? "Good" : s >= 45 ? "Fair" : "Needs Work";

const InterviewHistory = () => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();
  const token                 = localStorage.getItem("token");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/video-interview/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d.results || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f6fa",
      fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "2.5rem 3rem", maxWidth: "1000px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#111827", margin: 0 }}>
              Interview History
            </h1>
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "4px 0 0" }}>
              {data.length} session{data.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <button onClick={() => navigate("/interview")}
            style={{ padding: "0.6rem 1.25rem", background: "#3b4bff", color: "#fff",
              border: "none", borderRadius: "12px", fontWeight: "600", cursor: "pointer",
              fontFamily: "inherit", fontSize: "0.875rem" }}>
            + New Interview
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "4rem" }}>
            <div style={{ width: "2rem", height: "2rem", border: "3px solid #e0e7ff",
              borderTop: "3px solid #3b4bff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}

        {/* Empty */}
        {!loading && data.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "5rem", color: "#9ca3af" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎥</div>
            <p style={{ fontSize: "1rem", fontWeight: "600" }}>No interviews yet</p>
            <p style={{ fontSize: "0.875rem" }}>Complete a video interview to see your results here.</p>
            <button onClick={() => navigate("/interview")}
              style={{ marginTop: "1rem", padding: "0.6rem 1.5rem", background: "#3b4bff",
                color: "#fff", border: "none", borderRadius: "12px", fontWeight: "600",
                cursor: "pointer", fontFamily: "inherit" }}>
              Start Interview
            </button>
          </div>
        )}

        {/* Cards */}
        {!loading && data.map((item, idx) => (
          <div key={item.id}
            onClick={() => navigate(`/interview-detail/${item.id}`, { state: { result: item } })}
            style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0",
              padding: "1.5rem", marginBottom: "1rem", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              transition: "box-shadow 0.2s, transform 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(59,75,255,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "none"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>

              {/* Left: job info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1rem", fontWeight: "700", color: "#111827" }}>{item.job_title}</span>
                  {item.job_company && (
                    <span style={{ fontSize: "0.82rem", color: "#6b7280", fontWeight: "500" }}>@ {item.job_company}</span>
                  )}
                  <Badge
                    label={scoreLabel(item.overall_score)}
                    color={scoreColor(item.overall_score)}
                    bg={scoreBg(item.overall_score)}
                  />
                </div>

                <div style={{ fontSize: "0.78rem", color: "#9ca3af", marginBottom: "1rem" }}>
                  {fmtDate(item.created_at)}
                  {item.duration_sec ? ` · ${fmtDur(item.duration_sec)}` : ""}
                  {item.questions?.length ? ` · ${item.questions.length} questions` : ""}
                </div>

                {/* Score bars */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem" }}>
                  {[
                    ["Voice",       item.voice_score],
                    ["Eye Contact", item.eye_contact_score],
                    ["Posture",     item.posture_score],
                    ["Content",     item.content_score],
                  ].map(([label, score]) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: "600", color: "#9ca3af" }}>{label}</span>
                        <span style={{ fontSize: "0.7rem", fontWeight: "700", color: scoreColor(score) }}>{Math.round(score)}</span>
                      </div>
                      <div style={{ background: "#f3f4f6", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(score, 100)}%`, height: "100%",
                          background: scoreColor(score), borderRadius: "4px", transition: "width 0.6s" }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Speech chips */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                  {item.total_words > 0 && (
                    <span style={{ fontSize: "0.72rem", background: "#f9fafb", color: "#6b7280",
                      padding: "2px 8px", borderRadius: "6px", fontWeight: "600" }}>
                      {item.total_words} words
                    </span>
                  )}
                  {item.words_per_min > 0 && (
                    <span style={{ fontSize: "0.72rem", background: "#f9fafb", color: "#6b7280",
                      padding: "2px 8px", borderRadius: "6px", fontWeight: "600" }}>
                      {item.words_per_min} WPM
                    </span>
                  )}
                  {item.filler_count > 0 && (
                    <span style={{ fontSize: "0.72rem", background: "#fffbeb", color: "#f59e0b",
                      padding: "2px 8px", borderRadius: "6px", fontWeight: "600" }}>
                      {item.filler_count} fillers
                    </span>
                  )}
                  {item.voice_label && (
                    <span style={{ fontSize: "0.72rem", background: "#f0f2ff", color: "#3b4bff",
                      padding: "2px 8px", borderRadius: "6px", fontWeight: "600" }}>
                      {item.voice_label}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: overall score ring */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                <ScoreRing score={item.overall_score} size={64} />
                <span style={{ fontSize: "0.65rem", fontWeight: "700", color: "#9ca3af",
                  textTransform: "uppercase", letterSpacing: "0.06em" }}>Overall</span>
              </div>
            </div>
          </div>
        ))}

      </div>
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default InterviewHistory;
