import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import logo from "../assets/wm_logo.png";

// ── Shared UI atoms ────────────────────────────────────────────────────────────

const ScoreRing = ({ score, size = 72 }) => {
  const r    = size / 2 - 6;
  const circ = r * 2 * Math.PI;
  const off  = circ - (score / 100) * circ;
  const c    = score >= 70 ? "#10b981" : score >= 45 ? "#3b4bff" : "#f59e0b";
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle stroke="#f3f4f6" fill="transparent" strokeWidth="6" r={r} cx={size / 2} cy={size / 2} />
      <circle
        stroke={c} fill="transparent" strokeWidth="6" strokeLinecap="round"
        r={r} cx={size / 2} cy={size / 2}
        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size < 60 ? "11" : "14"} fontWeight="800" fill={c}>
        {Math.round(score)}
      </text>
    </svg>
  );
};

const MiniBar = ({ value, color }) => (
  <div style={{ background: "#f3f4f6", borderRadius: 4, height: 6, overflow: "hidden", flex: 1 }}>
    <div style={{
      width: `${Math.min(value, 100)}%`, height: "100%",
      background: color, borderRadius: 4, transition: "width 0.8s ease"
    }} />
  </div>
);

const scoreColor = s => s >= 70 ? "#10b981" : s >= 45 ? "#3b4bff" : "#f59e0b";
const scoreLabel = s => s >= 75 ? "Excellent" : s >= 60 ? "Good" : s >= 45 ? "Fair" : "Needs Work";

// ── Results Dashboard ──────────────────────────────────────────────────────────

const ResultsDashboard = ({ qaPairs, jobTitle, onRetry }) => {
  const answered = qaPairs.filter(qa => qa.answer?.trim() && qa.eval);
  const evals    = answered.map(qa => qa.eval);

  const avg = key => evals.length
    ? Math.round(evals.reduce((s, e) => s + (e[key] || 0), 0) / evals.length)
    : 0;

  const overall   = avg("score");
  const relevancy = avg("relevancy");
  const grammar   = avg("grammar");
  const tone      = avg("tone");

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 2rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#111827", margin: 0 }}>
              Interview Results
            </h1>
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "4px 0 0" }}>
              {jobTitle} · Text Interview · {answered.length} of {qaPairs.length} answered
            </p>
          </div>
          <button onClick={onRetry} style={{
            padding: "0.6rem 1.25rem", background: "#3b4bff", color: "#fff",
            border: "none", borderRadius: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", fontSize: "0.875rem"
          }}>
            ↩ New Interview
          </button>
        </div>

        {/* Overall hero card */}
        <div style={{
          background: "#fff", borderRadius: 20, border: "1px solid #ebebf0",
          padding: "2rem", marginBottom: "1.5rem",
          display: "flex", alignItems: "center", gap: "2rem",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
        }}>
          <ScoreRing score={overall} size={110} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Overall Performance
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: scoreColor(overall), margin: "4px 0" }}>
              {scoreLabel(overall)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "1rem" }}>
              {[["Relevancy", relevancy], ["Grammar", grammar], ["Tone", tone]].map(([label, val]) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(val) }}>{val}</span>
                  </div>
                  <MiniBar value={val} color={scoreColor(val)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #ebebf0",
          padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#9ca3af",
            textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "1.25rem"
          }}>
            Answer Analysis — Per Question
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {qaPairs.map((qa, i) => {
              const ev          = qa.eval;
              const notAnswered = !qa.answer?.trim();
              return (
                <div key={i} style={{
                  borderLeft: `3px solid ${notAnswered ? "#e5e7eb" : "#e0e7ff"}`,
                  paddingLeft: "1rem", opacity: notAnswered ? 0.55 : 1
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", flex: 1, paddingRight: 12 }}>
                      Q{i + 1}: {qa.question}
                      {notAnswered && (
                        <span style={{
                          marginLeft: 8, fontSize: 10, background: "#f3f4f6",
                          color: "#9ca3af", padding: "2px 8px", borderRadius: 6, fontWeight: 600
                        }}>
                          Skipped
                        </span>
                      )}
                    </div>
                    <ScoreRing score={ev?.score ?? 0} size={48} />
                  </div>

                  {notAnswered ? (
                    <div style={{
                      fontSize: 13, color: "#9ca3af", background: "#f9fafb",
                      padding: "0.6rem 0.75rem", borderRadius: 8
                    }}>
                      No answer was recorded for this question.
                    </div>
                  ) : (
                    <>
                      {/* Answer text */}
                      <div style={{
                        fontSize: 13, color: "#4b5563", background: "#f9fafb",
                        padding: "0.6rem 0.75rem", borderRadius: 8, marginBottom: 10,
                        lineHeight: 1.6, fontStyle: "italic"
                      }}>
                        "{qa.answer}"
                      </div>

                      {/* Sub-scores */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: 10 }}>
                        {[["Relevancy", ev?.relevancy], ["Grammar", ev?.grammar], ["Tone", ev?.tone]].map(([l, v]) => (
                          <div key={l}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>{l}</span>
                              <span style={{ fontSize: 10, color: "#374151", fontWeight: 700 }}>{v ?? "—"}</span>
                            </div>
                            <MiniBar value={v ?? 0} color="#3b4bff" />
                          </div>
                        ))}
                      </div>

                      {/* Brief feedback */}
                      <div style={{
                        fontSize: 13, color: "#4b5563", background: "#f8f9ff",
                        padding: "0.6rem 0.75rem", borderRadius: 8, marginBottom: 8, lineHeight: 1.6
                      }}>
                        {ev?.brief_feedback}
                      </div>

                      {/* Strengths + improvements */}
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        {ev?.strengths?.length > 0 && (
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>✓ Strengths</div>
                            {ev.strengths.map((s, j) => <div key={j} style={{ fontSize: 12, color: "#374151" }}>• {s}</div>)}
                          </div>
                        )}
                        {ev?.improvements?.length > 0 && (
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>↑ Improve</div>
                            {ev.improvements.map((s, j) => <div key={j} style={{ fontSize: 12, color: "#374151" }}>• {s}</div>)}
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
  );
};

// ── Main TextInterview Page ────────────────────────────────────────────────────

function TextInterview() {
  const location = useLocation();
  const navigate = useNavigate();
  const job      = location.state?.job;

  const [questions, setQuestions]       = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer]             = useState("");
  // Raw collected pairs during the interview: { question, answer }
  const [collected, setCollected]       = useState([]);
  const [finished, setFinished]         = useState(false);
  const [loading, setLoading]           = useState(true);
  // True while evaluating all answers + saving to DB
  const [analyzing, setAnalyzing]       = useState(false);
  const [error, setError]               = useState("");
  // Final pairs with evals attached — passed to dashboard
  const [finalPairs, setFinalPairs]     = useState([]);

  const email    = localStorage.getItem("email");
  const token    = localStorage.getItem("token");
  const jobTitle = job?.title || "Interview";

  // Fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!email) { setError("Please log in to continue."); setLoading(false); return; }
      if (!job)   { setError("No job information available."); setLoading(false); return; }
      try {
        const res = await axios.post("http://localhost:8000/interview/generate", {
          email,
          job_title:       job.title,
          job_description: job.description || job.preview_desc || "",
          job_skills:      job.skills || [],
          n_questions:     5,
        });
        setQuestions(res.data.questions);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to generate questions. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [job]);

  // ── Advance to next question (or finish) ───────────────────────────────────
  const advance = (ans) => {
    const pair    = { question: questions[currentIndex], answer: ans };
    const updated = [...collected, pair];
    setCollected(updated);
    setAnswer("");

    if (currentIndex === questions.length - 1) {
      runFinish(updated);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleNext   = () => advance(answer.trim());
  const handleSkip   = () => advance("");

  const handleFinish = () => {
    // Include current answer (even partial), pad rest as skipped
    const pair  = { question: questions[currentIndex], answer: answer.trim() };
    const soFar = [...collected, pair];
    for (let i = soFar.length; i < questions.length; i++) {
      soFar.push({ question: questions[i], answer: "" });
    }
    runFinish(soFar);
  };

  // ── Evaluate all answers in parallel, then save to DB ─────────────────────
  const runFinish = async (pairs) => {
    setAnalyzing(true);

    const withEvals = await Promise.all(
      pairs.map(async (qa) => {
        if (!qa.answer.trim()) return { ...qa, eval: null };
        try {
          const res = await axios.post("http://localhost:8000/interview/evaluate", {
            question:        qa.question,
            answer:          qa.answer,
            job_title:       jobTitle,
            job_description: job?.description || job?.preview_desc || "",
          });
          return { ...qa, eval: res.data };
        } catch {
          return { ...qa, eval: null };
        }
      })
    );

    // Save to DB — non-fatal if it fails
    try {
      await axios.post(
        "http://localhost:8000/interview/submit",
        {
          email,
          job_title:       jobTitle,
          job_description: job?.description || job?.preview_desc || "",
          job_skills:      job?.skills || [],
          questions,
          qa_pairs:        withEvals,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      // Results still shown locally
    }

    setFinalPairs(withEvals);
    setAnalyzing(false);
    setFinished(true);
  };

  const handleRetry = () => navigate("/interview");

  // ── Results ────────────────────────────────────────────────────────────────
  if (finished) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <ResultsDashboard qaPairs={finalPairs} jobTitle={jobTitle} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  // ── Interview / loading ────────────────────────────────────────────────────
  return (
    <div style={S.layout}>
      <Sidebar />
      <div style={S.main}>

        {/* Loading questions */}
        {loading && (
          <div style={S.centered}>
            <div style={S.spinner} />
            <p style={S.dimText}>Generating personalised questions…</p>
          </div>
        )}

        {/* Analysing — evaluating all answers after interview ends */}
        {analyzing && (
          <div style={S.centered}>
            <div style={S.spinner} />
            <p style={S.dimText}>Analysing your answers…</p>
            <p style={{ ...S.dimText, fontSize: 13, marginTop: 6, color: "#9ca3af" }}>
              Please wait a moment.
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={S.errorBox}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
            <p style={{ fontSize: 15, color: "#dc2626", fontWeight: 500, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Interview UI */}
        {!loading && !analyzing && !error && questions.length > 0 && (
          <div style={S.wrap}>

            {/* Logo */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <img src={logo} alt="WorkMate" style={{ height: 42, objectFit: "contain" }} />
            </div>

            {/* Progress bar */}
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
              {questions.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: i < currentIndex ? "#10b981" : i === currentIndex ? "#3b4bff" : "#e5e7eb",
                  transition: "background 0.3s"
                }} />
              ))}
            </div>

            {/* Question card */}
            <div style={S.card}>
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <span style={S.pill}>Question {currentIndex + 1} of {questions.length}</span>
              </div>

              <h2 style={S.question}>{questions[currentIndex]}</h2>

              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer here…"
                style={S.textarea}
                autoFocus
              />

              <div style={S.btnRow}>
                <button
                  style={{
                    ...S.btn, ...S.btnPrimary,
                    opacity: !answer.trim() ? 0.45 : 1,
                    cursor:  !answer.trim() ? "not-allowed" : "pointer",
                  }}
                  onClick={handleNext}
                  disabled={!answer.trim()}
                >
                  {currentIndex === questions.length - 1 ? "✓ Submit" : "⏭ Next Question"}
                </button>

                <button style={{ ...S.btn, ...S.btnGhost }} onClick={handleSkip}>
                  ✘ Skip
                </button>

                <button style={{ ...S.btn, ...S.btnDark }} onClick={handleFinish}>
                  ⏹ Finish Early
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        textarea:focus  { border-color:#3b4bff !important; box-shadow:0 0 0 3px rgba(59,75,255,0.12); }
      `}</style>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const S = {
  layout:    { display: "flex", minHeight: "100vh", background: "#f5f6fa", fontFamily: "'DM Sans','Segoe UI',sans-serif" },
  main:      { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px" },
  centered:  { textAlign: "center" },
  spinner:   { width: 50, height: 50, border: "5px solid #e5e7eb", borderTop: "5px solid #3b4bff", borderRadius: "50%", animation: "spin 0.9s linear infinite", margin: "0 auto 16px" },
  dimText:   { fontSize: 15, color: "#6b7280", fontWeight: 500, margin: 0 },
  errorBox:  { textAlign: "center", background: "#fff", padding: 40, borderRadius: 16, boxShadow: "0 8px 28px rgba(0,0,0,0.07)" },
  wrap:      { width: "100%", maxWidth: 800 },
  card:      { background: "#fff", borderRadius: 20, padding: "44px 48px", boxShadow: "0 8px 32px rgba(0,0,0,0.07)", border: "1.5px solid #e5e7eb" },
  pill:      { display: "inline-block", fontSize: 12, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", padding: "7px 18px", borderRadius: 20, letterSpacing: "0.04em" },
  question:  { fontSize: 22, fontWeight: 700, color: "#3b4bff", lineHeight: 1.5, marginBottom: 22, textAlign: "center" },
  textarea:  { width: "100%", height: 190, padding: "16px 18px", fontSize: 15, lineHeight: 1.65, borderRadius: 12, border: "1.5px solid #e5e7eb", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s", background: "#fafafa" },
  btnRow:    { display: "flex", gap: 12, marginTop: 22, justifyContent: "center", flexWrap: "wrap" },
  btn:       { padding: "12px 26px", fontSize: 14, fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s" },
  btnPrimary:{ background: "#3b4bff", color: "#fff" },
  btnGhost:  { background: "#f3f4f6", color: "#6b7280" },
  btnDark:   { background: "#111827", color: "#fff" },
};

export default TextInterview;
