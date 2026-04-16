import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

// ── shared mini-components ────────────────────────────────────────────────────
const ScoreRing = ({ score, size = 80, color }) => {
  const r    = size / 2 - 7;
  const circ = r * 2 * Math.PI;
  const off  = circ - (score / 100) * circ;
  const c    = color || (score >= 70 ? "#10b981" : score >= 45 ? "#3b4bff" : "#f59e0b");
  return (
    <svg width={size} height={size}>
      <circle stroke="#f3f4f6" fill="transparent" strokeWidth="6" r={r} cx={size/2} cy={size/2} />
      <circle stroke={c} fill="transparent" strokeWidth="6" strokeLinecap="round"
        r={r} cx={size/2} cy={size/2}
        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={off}
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size < 70 ? "11" : "16"} fontWeight="800" fill={c}>{Math.round(score || 0)}</text>
    </svg>
  );
};

const Bar = ({ value, color = "#3b4bff" }) => (
  <div style={{ background: "#f3f4f6", borderRadius: "6px", height: "7px", width: "100%", overflow: "hidden" }}>
    <div style={{ width: `${Math.min(value ?? 0, 100)}%`, height: "100%", background: color,
      borderRadius: "6px", transition: "width 0.8s ease" }} />
  </div>
);

const StatPill = ({ label, value, color = "#3b4bff" }) => (
  <div style={{ background: "#f8f9ff", border: "1px solid #e0e7ff", borderRadius: "12px",
    padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "2px" }}>
    <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#9ca3af",
      textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
    <span style={{ fontSize: "1.15rem", fontWeight: "800", color }}>{value}</span>
  </div>
);

const sc = (s) => (s || 0) >= 70 ? "#10b981" : (s || 0) >= 45 ? "#3b4bff" : "#f59e0b";

const InterviewDetail = () => {
  const { id }       = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();
  const token        = localStorage.getItem("token");
  const [data, setData]       = useState(location.state?.result?.full_results || null);
  const [meta, setMeta]       = useState(location.state?.result || null);
  const [loading, setLoading] = useState(!data);

  // Safely check if this is a text interview
  const isText = meta?.interview_type === 'text' || data?.interview_type === 'text';

  useEffect(() => {
    if (data) return; 
    
    // Choose the right endpoint based on the known type.
    const endpoint = isText 
        ? `http://127.0.0.1:8000/interview/history/${id}`
        : `http://127.0.0.1:8000/video-interview/history/${id}`;

    fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, data, isText, token]);

  if (loading) return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "2.5rem", height: "2.5rem", border: "3px solid #e0e7ff",
          borderTop: "3px solid #3b4bff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "1rem" }}>Result not found.</p>
          <button onClick={() => navigate("/interview-history")}
            style={{ marginTop: "1rem", padding: "0.6rem 1.25rem", background: "#3b4bff",
              color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontFamily: "inherit" }}>
            ← Back to History
          </button>
        </div>
      </div>
    </div>
  );

  const { overall_score, voice, eye_contact, posture, speech, content_scores, content_avg } = data;
  const questions    = data.questions || meta?.questions || [];
  const jobTitle     = meta?.job_title  || "Interview";
  const jobCompany   = meta?.job_company || "";
  const createdAt    = meta?.created_at  || data.created_at;
  const overallColor = sc(overall_score);
  const overallLabel = (overall_score || 0) >= 75 ? "Excellent" : (overall_score || 0) >= 60 ? "Good" :
                       (overall_score || 0) >= 45 ? "Fair" : "Needs Work";

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
      " at " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  // Dynamic header metrics matching the history card
  const heroMetrics = isText 
    ? [
        ["Content", content_avg || overall_score || 0],
        ["Grammar", data.avg_grammar || 0],
        ["Clarity", data.avg_tone|| 0]
      ] 
    : [
        ["Voice", voice?.score], 
        ["Eye Contact", eye_contact?.score], 
        ["Posture", posture?.score], 
        ["Content", content_avg]
      ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f6fa",
      fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      <Sidebar />

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: "1050px", margin: "0 auto", padding: "2.5rem 2rem" }}>

          {/* Back + header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
            <div>
              <button onClick={() => navigate("/interview-history")}
                style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer",
                  fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", padding: 0,
                  marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "4px" }}>
                ← Back to History
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h1 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#111827", margin: 0 }}>
                  {jobTitle}{jobCompany ? ` @ ${jobCompany}` : ""}
                </h1>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", padding: "3px 10px",
                  borderRadius: "8px", background: "#f3f4f6", color: "#6b7280", marginTop: "2px" }}>
                  {isText ? 'TEXT' : 'VIDEO'}
                </span>
              </div>
              <p style={{ color: "#9ca3af", fontSize: "0.82rem", margin: "4px 0 0" }}>
                {fmtDate(createdAt)}
                {!isText && speech?.duration_sec ? ` · ${Math.round(speech.duration_sec / 60)}m ${Math.round(speech.duration_sec % 60)}s` : ""}
              </p>
            </div>
            <button onClick={() => navigate("/interview")}
              style={{ padding: "0.6rem 1.25rem", background: "#3b4bff", color: "#fff",
                border: "none", borderRadius: "12px", fontWeight: "600", cursor: "pointer",
                fontFamily: "inherit", fontSize: "0.875rem" }}>
              + New Interview
            </button>
          </div>

          {/* Overall hero */}
          <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #ebebf0",
            padding: "2rem", marginBottom: "1.5rem", display: "flex", alignItems: "center",
            gap: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <ScoreRing score={overall_score || 0} size={110} color={overallColor} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.08em" }}>Overall Performance</div>
              <div style={{ fontSize: "2rem", fontWeight: "800", color: overallColor, margin: "4px 0" }}>
                {overallLabel}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${heroMetrics.length}, 1fr)`, gap: "1rem", marginTop: "1rem" }}>
                {heroMetrics.map(([label, score]) => (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: "600", color: "#374151" }}>{label}</span>
                      <span style={{ fontSize: "0.78rem", fontWeight: "700", color: sc(score) }}>{Math.round(score ?? 0)}</span>
                    </div>
                    <Bar value={score ?? 0} color={sc(score ?? 0)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Metric cards (ONLY SHOW IF VIDEO) */}
          {!isText && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "1.25rem", marginBottom: "1.5rem" }}>

              {/* Voice */}
              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0",
                padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af",
                      textTransform: "uppercase", letterSpacing: "0.07em" }}>Voice Confidence</div>
                    <div style={{ fontSize: "1.05rem", fontWeight: "700", color: "#111827", marginTop: "2px" }}>{voice?.label}</div>
                  </div>
                  <ScoreRing score={voice?.score ?? 0} size={56} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                  {[["Low", (voice?.probabilities?.low ?? 0)*100, "#f59e0b"],
                    ["Medium", (voice?.probabilities?.medium ?? 0)*100, "#3b4bff"],
                    ["High", (voice?.probabilities?.high ?? 0)*100, "#10b981"]
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: "600" }}>{l}</div>
                      <div style={{ fontSize: "1rem", fontWeight: "700", color: c }}>{Math.round(v)}%</div>
                      <Bar value={v} color={c} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Eye + Posture */}
              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0",
                padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af",
                      textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Eye Contact</div>
                    <ScoreRing score={eye_contact?.score ?? 0} size={56} />
                    <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#6b7280" }}>
                      {eye_contact?.label}<br />
                      <strong>{eye_contact?.contact_pct ?? 0}%</strong> direct contact
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af",
                      textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Posture</div>
                    <ScoreRing score={posture?.score ?? 0} size={56} />
                    <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#6b7280" }}>{posture?.label}</div>
                    {posture?.issues?.map((iss, i) => (
                      <div key={i} style={{ fontSize: "0.72rem", color: "#f59e0b", background: "#fffbeb",
                        padding: "2px 7px", borderRadius: "5px", marginTop: "3px" }}>⚠ {iss}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Speech */}
              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0",
                padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af",
                  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "1rem" }}>Speech Metrics</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <StatPill label="Words"      value={speech?.total_words ?? 0} />
                  <StatPill label="WPM"        value={speech?.words_per_min ?? 0} color="#10b981" />
                  <StatPill label="Fillers"    value={speech?.filler_count ?? 0} color={speech?.filler_pct > 10 ? "#f59e0b" : "#10b981"} />
                  <StatPill label="Filler/min" value={speech?.filler_rate ?? 0}  color={speech?.filler_rate > 8  ? "#ef4444" : "#10b981"} />
                </div>
              </div>

              {/* Transcript */}
              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0",
                padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af",
                  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Transcript</div>
                <div style={{ fontSize: "0.85rem", color: "#374151", lineHeight: "1.7",
                  maxHeight: "140px", overflowY: "auto", padding: "0.5rem",
                  background: "#f9fafb", borderRadius: "8px" }}>
                  {speech?.transcript || "No transcript available."}
                </div>
              </div>
            </div>
          )}

          {/* Per-question */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0",
            padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af",
              textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "1.25rem" }}>
              Answer Analysis — Per Question
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {(content_scores || []).map((q, i) => {
                const notAnswered = q.brief_feedback === "No answer recorded for this question.";
                
                // Dynamically select the metrics to show per question based on type
                const questionMetrics = isText 
                  ? [["Relevance", q.relevance], ["Clarity", q.clarity], ["Grammar", q.grammar]]
                  : [["Relevance", q.relevance], ["Clarity", q.clarity], ["Depth", q.depth], ["Structure", q.structure]];

                // Fallback to grab the user's answer text from common object keys
                const userAnswerText = q.answer || q.transcript || q.response || "";

                return (
                  <div key={i} style={{ borderLeft: `3px solid ${notAnswered ? "#e5e7eb" : "#e0e7ff"}`,
                    paddingLeft: "1rem", opacity: notAnswered ? 0.55 : 1 }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: "700", color: "#111827",
                        flex: 1, paddingRight: "1rem" }}>
                        Q{i+1}: {q.question}
                        {notAnswered && (
                          <span style={{ marginLeft: "8px", fontSize: "0.7rem", background: "#f3f4f6",
                            color: "#9ca3af", padding: "2px 8px", borderRadius: "6px", fontWeight: "600" }}>
                            Not answered
                          </span>
                        )}
                      </div>
                      <ScoreRing score={q.score ?? 0} size={46} />
                    </div>

                    {/* NEW: User Answer Block */}
                    {!notAnswered && userAnswerText && (
                      <div style={{ marginBottom: "1rem", marginTop: "0.5rem" }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                          Your Answer
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#374151", background: "#f9fafb", borderLeft: "3px solid #d1d5db", padding: "0.75rem", borderRadius: "0 8px 8px 0", fontStyle: "italic", lineHeight: "1.6" }}>
                          "{userAnswerText}"
                        </div>
                      </div>
                    )}

                    {notAnswered ? (
                      <div style={{ fontSize: "0.82rem", color: "#9ca3af", background: "#f9fafb",
                        padding: "0.6rem 0.75rem", borderRadius: "8px" }}>
                        No answer was recorded for this question.
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: `repeat(${questionMetrics.length}, 1fr)`, gap: "0.5rem", marginBottom: "0.75rem" }}>
                          {questionMetrics.map(([l, v]) => (
                            <div key={l}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: "600" }}>{l}</span>
                                <span style={{ fontSize: "0.7rem", color: "#374151", fontWeight: "700" }}>{v ?? "—"}</span>
                              </div>
                              <Bar value={v ?? 0} color="#3b4bff" />
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#4b5563", background: "#f8f9ff",
                          padding: "0.6rem 0.75rem", borderRadius: "8px", marginBottom: "0.5rem", lineHeight: "1.6" }}>
                          {q.brief_feedback}
                        </div>
                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                          {q.strengths?.length > 0 && (
                            <div style={{ flex: 1, minWidth: "160px" }}>
                              <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#10b981",
                                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>✓ Strengths</div>
                              {q.strengths.map((s, j) => <div key={j} style={{ fontSize: "0.78rem", color: "#374151" }}>• {s}</div>)}
                            </div>
                          )}
                          {q.improvements?.length > 0 && (
                            <div style={{ flex: 1, minWidth: "160px" }}>
                              <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#f59e0b",
                                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>↑ Improve</div>
                              {q.improvements.map((s, j) => <div key={j} style={{ fontSize: "0.78rem", color: "#374151" }}>• {s}</div>)}
                            </div>
                          )}
                          {q.missing_keywords?.length > 0 && (
                            <div style={{ flex: 1, minWidth: "160px" }}>
                              <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#ef4444",
                                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>⚑ Missing Keywords</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                {q.missing_keywords.map((k, j) => (
                                  <span key={j} style={{ background: "#fff1f2", color: "#ef4444",
                                    fontSize: "0.7rem", fontWeight: "600", padding: "2px 7px", borderRadius: "5px" }}>{k}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default InterviewDetail;
