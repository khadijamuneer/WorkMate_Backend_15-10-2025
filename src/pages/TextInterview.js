import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import logo from "../assets/wm_logo.png";

function TextInterview() {
  const location = useLocation();
  const job = location.state?.job;
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchQuestions = async () => {
      const email = localStorage.getItem("email");
      
      if (!email) {
        setError("Please log in to continue.");
        setLoading(false);
        return;
      }

      if (!job) {
        setError("No job information available.");
        setLoading(false);
        return;
      }

      try {
        const res = await axios.post("http://localhost:8000/interview/generate", {
          email: email,
          job_title: job.title,
          job_description: job.description || job.preview_desc || "",
          job_skills: job.skills || [],
          n_questions: 5
        });
        
        setQuestions(res.data.questions);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || "Failed to generate questions. Please try again.");
        setLoading(false);
      }
    };
    
    fetchQuestions();
  }, [job]);

  // ---------------------------
  // NEXT QUESTION (save answer)
  // ---------------------------
  const handleNext = () => {
    const updated = [
      ...answers,
      { question: questions[currentIndex], answer }
    ];

    setAnswers(updated);
    setAnswer("");

    if (currentIndex === questions.length - 1) {
      setFinished(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // ---------------------------
  // SKIP QUESTION (save nothing)
  // ---------------------------
  const handleSkip = () => {
    setAnswer("");

    if (currentIndex === questions.length - 1) {
      setFinished(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // ---------------------------
  // FINISH INTERVIEW
  // (optional: save partially typed answer)
  // ---------------------------
  const handleFinish = () => {
    let updated = [...answers];

    if (answer.trim()) {
      updated.push({
        question: questions[currentIndex],
        answer
      });
    }

    setAnswers(updated);
    setFinished(true);
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        {loading && (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Generating personalized questions...</p>
          </div>
        )}
        
        {error && (
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>⚠️</div>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}
        
        {!loading && !error && !finished && questions.length > 0 && (
          <div style={styles.interviewContainer}>
            <div style={styles.header}>
              <div style={styles.logoContainer}>
                <img src={logo} alt="WorkMate" style={styles.logoImage} />
              </div>
            </div>

            <div style={styles.questionCard}>
              <div style={styles.questionHeader}>
                <span style={styles.questionNumber}>
                  Question {currentIndex + 1} of {questions.length}
                </span>
              </div>

              <h2 style={styles.question}>{questions[currentIndex]}</h2>

              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer"
                style={styles.textarea}
                autoFocus
              />

              <div style={styles.buttonContainer}>

                {/* NEXT QUESTION (disabled if empty) */}
                <button 
                  style={{
                    ...styles.button,
                    ...styles.nextButton,
                    opacity: !answer.trim() ? 0.5 : 1,
                    cursor: !answer.trim() ? "not-allowed" : "pointer"
                  }}
                  onClick={handleNext}
                  disabled={!answer.trim()}
                >
                  <span style={styles.buttonIcon}>⏭</span>
                  Next Question
                </button>

                {/* SKIP QUESTION (always active) */}
                <button 
                  style={{...styles.button, ...styles.skipButton}}
                  onClick={handleSkip}
                >
                  <span style={styles.buttonIcon}>✘</span>
                  Skip Question
                </button>

                {/* FINISH INTERVIEW */}
                <button 
                  style={{...styles.button, ...styles.finishButton}}
                  onClick={handleFinish}
                >
                  <span style={styles.buttonIcon}>✓</span>
                  Finish Interview
                </button>

              </div>
            </div>
          </div>
        )}

        {finished && (
          <div style={styles.completionContainer}>
            <div style={styles.successIcon}>🎉</div>
            <h2 style={styles.completionTitle}>Interview Completed!</h2>
            <p style={styles.completionText}>
              Great job! You've answered {answers.length} question{answers.length !== 1 ? 's' : ''}.
            </p>
            
            <div style={styles.answersSection}>
              <h3 style={styles.answersTitle}>Your Answers:</h3>
              {answers.map((item, idx) => (
                <div key={idx} style={styles.answerCard}>
                  <div style={styles.answerHeader}>
                    <span style={styles.answerNumber}>Q{idx + 1}</span>
                  </div>
                  <p style={styles.answerQuestion}>{item.question}</p>
                  <div style={styles.answerDivider}></div>
                  <p style={styles.answerText}>{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f8f9fb",
  },
  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
  },
  loadingContainer: {
    textAlign: "center",
  },
  spinner: {
    width: "60px",
    height: "60px",
    border: "6px solid #e5e7eb",
    borderTop: "6px solid #3b4bff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px",
  },
  loadingText: {
    fontSize: "18px",
    color: "#6b7280",
    fontWeight: "500",
  },
  errorContainer: {
    textAlign: "center",
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
  },
  errorIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  errorText: {
    fontSize: "18px",
    color: "#dc2626",
    fontWeight: "500",
  },
  interviewContainer: {
    width: "100%",
    maxWidth: "900px",
  },
  header: {
    marginBottom: "40px",
  },
  logoContainer: {
    textAlign: "center",
  },
  logoImage: {
    height: "48px",
    objectFit: "contain",
  },
  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "48px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
    border: "2px solid #e5e7eb",
  },
  questionHeader: {
    marginBottom: "24px",
    textAlign: "center",
  },
  questionNumber: {
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "600",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    padding: "8px 20px",
    borderRadius: "20px",
    letterSpacing: "0.5px",
  },
  question: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#3b4bff",
    lineHeight: "1.5",
    marginBottom: "32px",
    textAlign: "center",
  },
  textarea: {
    width: "100%",
    height: "200px",
    padding: "20px",
    fontSize: "16px",
    lineHeight: "1.6",
    borderRadius: "12px",
    border: "2px solid #e5e7eb",
    fontFamily: "inherit",
    resize: "vertical",
    transition: "border-color 0.2s",
    outline: "none",
    boxSizing: "border-box",
  },
  buttonContainer: {
    display: "flex",
    gap: "16px",
    marginTop: "32px",
    justifyContent: "center",
  },
  button: {
    padding: "14px 32px",
    fontSize: "16px",
    fontWeight: "600",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  nextButton: {
    backgroundColor: "#3b4bff",
    color: "white",
  },
  finishButton: {
    backgroundColor: "#6b7280",
    color: "white",
  },
  buttonIcon: {
    fontSize: "18px",
  },
  completionContainer: {
    width: "100%",
    maxWidth: "900px",
    textAlign: "center",
  },
  successIcon: {
    fontSize: "64px",
    marginBottom: "24px",
  },
  completionTitle: {
    fontSize: "36px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "12px",
  },
  completionText: {
    fontSize: "18px",
    color: "#6b7280",
    marginBottom: "48px",
  },
  answersSection: {
    textAlign: "left",
  },
  answersTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "24px",
  },
  answerCard: {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "16px",
    marginBottom: "20px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
    border: "1px solid #e5e7eb",
  },
  answerHeader: {
    marginBottom: "12px",
  },
  answerNumber: {
    display: "inline-block",
    backgroundColor: "#3b4bff",
    color: "white",
    padding: "4px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "700",
  },
  answerQuestion: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
    lineHeight: "1.5",
    marginBottom: "12px",
  },
  answerDivider: {
    height: "1px",
    backgroundColor: "#e5e7eb",
    marginBottom: "12px",
  },
  answerText: {
    fontSize: "15px",
    color: "#4b5563",
    lineHeight: "1.6",
    margin: 0,
  },
};

export default TextInterview;
