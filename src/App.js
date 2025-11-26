
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signup from "./components/Signup";
import Login from "./components/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile"; // ✅ new import
import JobsPage from "./pages/JobsPages";
import ResumePage from "./pages/ResumePage"
import ResumeUpload from "./pages/ResumeUpload"
import TailorResumePage from "./pages/TailorResumePage";





function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/edit-profile" element={<EditProfile />} /> {/* ✅ new */}
        <Route path="/resume-generator" element={<ResumePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/resume" element={<ResumeUpload />} /> 
        <Route path="/tailor-resume" element={<TailorResumePage />} />
      </Routes>
    </Router>
  );
}

export default App;

