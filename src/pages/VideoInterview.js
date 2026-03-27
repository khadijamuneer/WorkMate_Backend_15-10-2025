import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

// ── tiny helpers ──────────────────────────────────────────────────────────────
const ScoreRing = ({ score, size = 80, label, color }) => {
  const r = size / 2 - 8;
  const circ = r * 2 * Math.PI;
  const offset = circ - (score / 100) * circ;
  const c = color || (score >= 70 ? "#10b981" : score >= 45 ? "#3b4bff" : "#f59e0b");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <svg width={size} height={size}>
        <circle stroke="#f3f4f6" fill="transparent" strokeWidth="7" r={r} cx={size/2} cy={size/2} />
        <circle stroke={c} fill="transparent" strokeWidth="7" strokeLinecap="round"
          r={r} cx={size/2} cy={size/2}
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          fontSize={size < 70 ? "11" : "15"} fontWeight="800" fill={c}>{Math.round(score)}</text>
      </svg>
      {label && <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>{label}</span>}
    </div>
  );
};

const Bar = ({ value, max = 100, color = "#3b4bff" }) => (
  <div style={{ background: "#f3f4f6", borderRadius: "6px", height: "8px", width: "100%", overflow: "hidden" }}>
    <div style={{ width: `${Math.min(value/max*100, 100)}%`, height: "100%", background: color, borderRadius: "6px", transition: "width 0.8s ease" }} />
  </div>
);

const StatPill = ({ label, value, unit = "", color = "#3b4bff" }) => (
  <div style={{ background: "#f8f9ff", border: "1px solid #e0e7ff", borderRadius: "12px", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "2px" }}>
    <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
    <span style={{ fontSize: "1.2rem", fontWeight: "800", color }}>{value}{unit}</span>
  </div>
);

// ── Dashboard component ───────────────────────────────────────────────────────
const Dashboard = ({ results, questions, jobTitle, onRetry }) => {
  const { overall_score, voice, eye_contact, posture, speech, content_scores, content_avg } = results;

  const overallColor = overall_score >= 70 ? "#10b981" : overall_score >= 45 ? "#3b4bff" : "#f59e0b";
  const overallLabel = overall_score >= 75 ? "Excellent" : overall_score >= 60 ? "Good" : overall_score >= 45 ? "Fair" : "Needs Work";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2.5rem 2rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#111827", margin: 0 }}>Interview Results</h1>
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "4px 0 0" }}>
              {jobTitle} · {speech?.duration_sec ? `${Math.round(speech.duration_sec / 60)}m ${Math.round(speech.duration_sec % 60)}s` : ""}
              {results.questions_answered > 0 && ` · ${results.questions_answered} of ${questions.length} questions answered`}
            </p>
          </div>
          <button onClick={onRetry}
            style={{ padding: "0.6rem 1.25rem", background: "#3b4bff", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", fontSize: "0.875rem" }}>
            ↩ New Interview
          </button>
        </div>

        {/* Overall score hero */}
        <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #ebebf0", padding: "2rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <ScoreRing score={overall_score} size={110} color={overallColor} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Overall Performance</div>
            <div style={{ fontSize: "2rem", fontWeight: "800", color: overallColor, margin: "4px 0" }}>{overallLabel}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginTop: "1rem" }}>
              {[
                { label: "Voice",       score: voice?.score },
                { label: "Eye Contact", score: eye_contact?.score },
                { label: "Posture",     score: posture?.score },
                { label: "Content",     score: content_avg },
              ].map(({ label, score }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: "600", color: "#374151" }}>{label}</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: "700", color: score >= 70 ? "#10b981" : score >= 45 ? "#3b4bff" : "#f59e0b" }}>{Math.round(score)}</span>
                  </div>
                  <Bar value={score} color={score >= 70 ? "#10b981" : score >= 45 ? "#3b4bff" : "#f59e0b"} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "1.25rem", marginBottom: "1.5rem" }}>

          {/* Voice confidence */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>Voice Confidence</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#111827", marginTop: "2px" }}>{voice?.label}</div>
              </div>
              <ScoreRing score={voice?.score ?? 0} size={60} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              {[["Low",    (voice?.probabilities?.low    ?? 0) * 100, "#f59e0b"],
                ["Medium", (voice?.probabilities?.medium ?? 0) * 100, "#3b4bff"],
                ["High",   (voice?.probabilities?.high   ?? 0) * 100, "#10b981"]
              ].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: "600" }}>{l}</div>
                  <div style={{ fontSize: "1rem", fontWeight: "700", color: c }}>{Math.round(v)}%</div>
                  <Bar value={v} color={c} />
                </div>
              ))}
            </div>
          </div>

          {/* Eye contact + posture */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Eye Contact</div>
                <ScoreRing score={eye_contact?.score ?? 0} size={60} label={eye_contact?.label} />
                <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#6b7280" }}>
                  Direct contact: <strong>{eye_contact?.contact_pct ?? 0}%</strong> of time
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Posture</div>
                <ScoreRing score={posture?.score ?? 0} size={60} label={posture?.label} />
                {posture?.issues?.length > 0 && (
                  <div style={{ marginTop: "0.5rem" }}>
                    {posture.issues.map((iss, i) => (
                      <div key={i} style={{ fontSize: "0.75rem", color: "#f59e0b", background: "#fffbeb", padding: "2px 8px", borderRadius: "6px", marginTop: "3px" }}>⚠ {iss}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Speech stats */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "1rem" }}>Speech Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <StatPill label="Words"      value={speech?.total_words ?? 0} />
              <StatPill label="WPM"        value={speech?.words_per_min ?? 0} color="#10b981" />
              <StatPill label="Fillers"    value={speech?.filler_count ?? 0} color={speech?.filler_pct > 10 ? "#f59e0b" : "#10b981"} />
              <StatPill label="Filler/min" value={speech?.filler_rate ?? 0}  color={speech?.filler_rate > 8  ? "#ef4444" : "#10b981"} />
            </div>
          </div>

          {/* Transcript */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Transcript</div>
            <div style={{ fontSize: "0.85rem", color: "#374151", lineHeight: "1.7", maxHeight: "140px", overflowY: "auto", padding: "0.5rem", background: "#f9fafb", borderRadius: "8px" }}>
              {speech?.transcript || "No transcript available."}
            </div>
          </div>
        </div>

        {/* Per-question content scores */}
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "1.25rem" }}>Answer Analysis — Per Question</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {(content_scores || []).map((q, i) => {
              const notAnswered = q.brief_feedback === "No answer recorded for this question.";
              return (
                <div key={i} style={{ borderLeft: `3px solid ${notAnswered ? "#e5e7eb" : "#e0e7ff"}`, paddingLeft: "1rem", opacity: notAnswered ? 0.6 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: "700", color: "#111827", flex: 1, paddingRight: "1rem" }}>
                      Q{i+1}: {q.question}
                      {notAnswered && <span style={{ marginLeft: "8px", fontSize: "0.7rem", background: "#f3f4f6", color: "#9ca3af", padding: "2px 8px", borderRadius: "6px", fontWeight: "600" }}>Not answered</span>}
                    </div>
                    <ScoreRing score={q.score ?? 0} size={48} />
                  </div>

                  {notAnswered ? (
                    <div style={{ fontSize: "0.82rem", color: "#9ca3af", background: "#f9fafb", padding: "0.6rem 0.75rem", borderRadius: "8px" }}>
                      No answer was recorded for this question.
                    </div>
                  ) : (
                    <>
                      {/* sub-scores */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        {[["Relevance", q.relevance], ["Clarity", q.clarity], ["Depth", q.depth], ["Structure", q.structure]].map(([l, v]) => (
                          <div key={l}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                              <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: "600" }}>{l}</span>
                              <span style={{ fontSize: "0.7rem", color: "#374151", fontWeight: "700" }}>{v ?? "—"}</span>
                            </div>
                            <Bar value={v ?? 0} color="#3b4bff" />
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#4b5563", background: "#f8f9ff", padding: "0.6rem 0.75rem", borderRadius: "8px", marginBottom: "0.5rem", lineHeight: "1.6" }}>
                        {q.brief_feedback}
                      </div>
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        {q.strengths?.length > 0 && (
                          <div style={{ flex: 1, minWidth: "180px" }}>
                            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#10b981", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>✓ Strengths</div>
                            {q.strengths.map((s, j) => <div key={j} style={{ fontSize: "0.78rem", color: "#374151" }}>• {s}</div>)}
                          </div>
                        )}
                        {q.improvements?.length > 0 && (
                          <div style={{ flex: 1, minWidth: "180px" }}>
                            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>↑ Improve</div>
                            {q.improvements.map((s, j) => <div key={j} style={{ fontSize: "0.78rem", color: "#374151" }}>• {s}</div>)}
                          </div>
                        )}
                        {q.missing_keywords?.length > 0 && (
                          <div style={{ flex: 1, minWidth: "180px" }}>
                            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>⚑ Missing Keywords</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {q.missing_keywords.map((k, j) => (
                                <span key={j} style={{ background: "#fff1f2", color: "#ef4444", fontSize: "0.7rem", fontWeight: "600", padding: "2px 7px", borderRadius: "5px" }}>{k}</span>
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
  );
};


// ── Main VideoInterview page ──────────────────────────────────────────────────
const VideoInterview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const job      = location.state?.job;

  const [phase, setPhase]             = useState("loading");
  const [questions, setQuestions]     = useState([]);
  const [qIndex, setQIndex]           = useState(0);
  const [recording, setRecording]     = useState(false);
  const [results, setResults]         = useState(null);
  const [error, setError]             = useState("");
  const [timeLeft, setTimeLeft]       = useState(120);
  const [timerActive, setTimerActive] = useState(false);

  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef   = useRef([]);
  const allBlobsRef = useRef([]);
  const timerRef    = useRef(null);
  // Track exactly how many questions were recorded
  const questionsAnsweredRef = useRef(0);

  const token    = localStorage.getItem("token");
  const jobTitle = job?.title || "Software Engineer";
  const jobDesc  = job?.full_desc || job?.preview_desc || "";

  // ── fetch questions ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!job) { navigate("/jobs"); return; }
    const fetchQs = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/video-interview/questions?job_title=${encodeURIComponent(jobTitle)}&job_desc=${encodeURIComponent(jobDesc.slice(0,300))}&num_questions=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setQuestions(data.questions || []);
      } catch {
        setQuestions([
          "Tell me about yourself and your background.",
          "What relevant experience do you have for this role?",
          "Describe a challenging problem you solved.",
          "How do you handle working under pressure?",
          "Do you have any questions for us?",
        ]);
      }
      setPhase("ready");
    };
    fetchQs();
  }, []);

  // ── timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (timerActive && timeLeft === 0) {
      // Auto-stop when time runs out
      handleStopRecording();
    }
    return () => clearTimeout(timerRef.current);
  }, [timerActive, timeLeft]);

  // ── webcam ────────────────────────────────────────────────────────────────
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play().catch(err => console.error("Play error:", err));
        }
      }, 100);
    } catch (e) {
      console.error(e);
      setError("Could not access webcam/microphone: " + e.message);
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // ── recording ─────────────────────────────────────────────────────────────
  const handleStartRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    let options = { mimeType: "video/webm;codecs=vp8,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm" };
    }

    const recorder = new MediaRecorder(streamRef.current, options);
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorderRef.current = recorder;
    recorder.start(200);
    setRecording(true);
    setTimeLeft(120);
    setTimerActive(true);
  };

  const stopRecordingAsync = () => {
    return new Promise((resolve) => {
      if (!recorderRef.current) return resolve();

      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        if (blob.size > 0) {
          allBlobsRef.current.push(blob);
          // Increment count of answered questions
          questionsAnsweredRef.current += 1;
        } else {
          console.warn("⚠ Empty blob detected");
        }
        setRecording(false);
        resolve();
      };

      recorderRef.current.stop();
    });
  };

  const handleStopRecording = async () => {
    setTimerActive(false);
    await stopRecordingAsync();
  };

  const handleNextQuestion = async () => {
    if (recording) await stopRecordingAsync();
    if (qIndex < questions.length - 1) {
      setQIndex(i => i + 1);
      setTimeLeft(120);
    }
  };

  const handleEndInterview = async () => {
    try {
      setTimerActive(false);
      if (recording) await stopRecordingAsync();
      stopWebcam();
      setPhase("analyzing");
      await submitForAnalysis();
    } catch (err) {
      console.error(err);
      setError("Failed to end interview properly.");
      setPhase("ready");
    }
  };

  // ── submit ────────────────────────────────────────────────────────────────
  const submitForAnalysis = async () => {
    try {
      if (allBlobsRef.current.length === 0) {
        setError("No recorded video found. Please record at least one answer.");
        setPhase("ready");
        return;
      }

      const combined = new Blob(allBlobsRef.current, { type: "video/webm" });
      if (combined.size === 0) {
        setError("Recorded video is empty.");
        setPhase("ready");
        return;
      }

      const formData = new FormData();
      formData.append("video", combined, "interview.webm");
      formData.append("questions", JSON.stringify(questions));
      formData.append("job_title", jobTitle);
      formData.append("questions_answered", String(questionsAnsweredRef.current)); // ← key fix

      const res = await fetch("http://127.0.0.1:8000/video-interview/analyze", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Analysis failed");
      }

      const data = await res.json();
      setResults(data);
      setPhase("results");

    } catch (err) {
      console.error(err);
      setError(`Analysis error: ${err.message}`);
      setPhase("ready");
    }
  };

  const handleStartInterview = async () => {
    questionsAnsweredRef.current = 0;
    allBlobsRef.current = [];
    await startWebcam();
    setPhase("interview");
    setQIndex(0);
  };

  const handleRetry = () => {
    setPhase("ready");
    setQIndex(0);
    setResults(null);
    setError("");
    questionsAnsweredRef.current = 0;
    allBlobsRef.current = [];
  };

  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // ── results ───────────────────────────────────────────────────────────────
  if (phase === "results" && results) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
        <Sidebar />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <Dashboard results={results} questions={questions} jobTitle={jobTitle} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f6fa", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>

        {/* Job pill */}
        <div style={{ background: "#f0f2ff", color: "#3b4bff", fontSize: "0.8rem", fontWeight: "700", padding: "4px 14px", borderRadius: "9999px", marginBottom: "1.5rem" }}>
          {jobTitle} {job?.company ? `· ${job.company}` : ""}
        </div>

        {/* Loading */}
        {phase === "loading" && (
          <div style={{ textAlign: "center", color: "#9ca3af" }}>
            <div style={{ width: "2.5rem", height: "2.5rem", border: "3px solid #e0e7ff", borderTop: "3px solid #3b4bff", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} />
            <p>Preparing your interview questions…</p>
          </div>
        )}

        {/* Analyzing */}
        {phase === "analyzing" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "3rem", height: "3rem", border: "4px solid #e0e7ff", borderTop: "4px solid #3b4bff", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1.5rem" }} />
            <h2 style={{ color: "#111827", fontWeight: "700", margin: 0 }}>Analysing your interview…</h2>
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginTop: "0.5rem" }}>Running voice confidence · eye contact · posture · content scoring</p>
            <p style={{ color: "#9ca3af", fontSize: "0.8rem" }}>This may take 1–2 minutes.</p>
          </div>
        )}

        {/* Ready */}
        {phase === "ready" && (
          <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #ebebf0", padding: "2.5rem", maxWidth: "560px", width: "100%", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎥</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#111827", margin: "0 0 0.5rem" }}>Video Mock Interview</h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: "1.6", marginBottom: "1.5rem" }}>
              You'll be asked <strong>{questions.length} questions</strong>. Record your answer for each, then click Next or End Interview when done.
              Your full session will be analysed for voice confidence, eye contact, posture, and answer quality.
            </p>
            {error && (
              <div style={{ background: "#fff1f2", color: "#ef4444", padding: "0.75rem", borderRadius: "10px", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</div>
            )}
            <div style={{ background: "#f8f9ff", borderRadius: "12px", padding: "1rem", marginBottom: "1.5rem", textAlign: "left" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Questions Preview</div>
              {questions.map((q, i) => (
                <div key={i} style={{ fontSize: "0.85rem", color: "#374151", padding: "4px 0", borderBottom: i < questions.length-1 ? "1px solid #f3f4f6" : "none" }}>
                  <span style={{ color: "#3b4bff", fontWeight: "700" }}>Q{i+1}.</span> {q}
                </div>
              ))}
            </div>
            <button onClick={handleStartInterview}
              style={{ width: "100%", padding: "0.875rem", background: "#3b4bff", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", fontSize: "1rem", cursor: "pointer", fontFamily: "inherit" }}>
              Start Interview
            </button>
          </div>
        )}

        {/* Interview */}
        {phase === "interview" && (
          <div style={{ width: "100%", maxWidth: "900px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Progress bar */}
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {questions.map((_, i) => (
                <div key={i} style={{ flex: 1, height: "4px", borderRadius: "2px", background: i < qIndex ? "#10b981" : i === qIndex ? "#3b4bff" : "#e5e7eb", transition: "background 0.3s" }} />
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              {/* Question card */}
              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #ebebf0", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Question {qIndex+1} of {questions.length}
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", color: timeLeft <= 30 ? "#ef4444" : "#3b4bff", background: timeLeft <= 30 ? "#fff1f2" : "#f0f2ff", padding: "3px 10px", borderRadius: "8px" }}>
                    ⏱ {fmtTime(timeLeft)}
                  </span>
                </div>

                <p style={{ fontSize: "1.1rem", fontWeight: "600", color: "#111827", lineHeight: "1.6", margin: 0 }}>
                  {questions[qIndex]}
                </p>

                {recording && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff1f2", borderRadius: "10px", padding: "0.6rem 0.875rem" }}>
                    <div style={{ width: "10px", height: "10px", background: "#ef4444", borderRadius: "50%", animation: "pulse 1s infinite" }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#ef4444" }}>Recording…</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "auto" }}>
                  {!recording ? (
                    <button onClick={handleStartRecording}
                      style={{ flex: 1, padding: "0.7rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                      ● Start Recording
                    </button>
                  ) : (
                    <button onClick={handleStopRecording}
                      style={{ flex: 1, padding: "0.7rem", background: "#374151", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
                      ■ Stop Recording
                    </button>
                  )}
                  {qIndex < questions.length - 1 ? (
                    <button onClick={handleNextQuestion}
                      style={{ flex: 1, padding: "0.7rem", background: "#f0f2ff", color: "#3b4bff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
                      Next →
                    </button>
                  ) : (
                    <button onClick={handleEndInterview}
                      style={{ flex: 1, padding: "0.7rem", background: "#10b981", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
                      Finish ✓
                    </button>
                  )}
                </div>

                <button onClick={handleEndInterview}
                  style={{ padding: "0.5rem", background: "none", color: "#9ca3af", border: "1px solid #e5e7eb", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8rem" }}>
                  End Interview Early
                </button>
              </div>

              {/* Webcam */}
              <div style={{ background: "#111827", borderRadius: "16px", overflow: "hidden", position: "relative", minHeight: "320px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <video ref={videoRef} muted playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {recording && (
                  <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(239,68,68,0.9)", color: "#fff", fontSize: "0.75rem", fontWeight: "700", padding: "4px 10px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{ width: "8px", height: "8px", background: "#fff", borderRadius: "50%" }} /> REC
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin  { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `}</style>
      </div>
    </div>
  );
};

export default VideoInterview;