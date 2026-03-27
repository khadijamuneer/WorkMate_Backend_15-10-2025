import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import wmLogo from "../assets/wm_logo.png";

const NAV_ITEMS = [
  {
    label: "My Profile",
    path: "/profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    label: "My Resumes",
    path: "/resume",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    label: "Jobs",
    path: "/jobs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
  {
    label: "Interview Prep",
    path: "/interview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },

  {
    label: "Interview History",
    path: "/interview-history",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18"/>
        <path d="M18 17V9"/>
        <path d="M13 17V5"/>
        <path d="M8 17v-3"/>
      </svg>
    ),
  },
  {
    label: "Learn Skills",
    path: "/learn",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
];

const Sidebar = ({ profile, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [logoutHovered, setLogoutHovered] = useState(false);

  const name = profile?.personal_info?.name || "User";
  const email = profile?.personal_info?.email || "";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

        .wm-sidebar {
          width: 220px;
          min-height: 100vh;
          background: #ffffff;
          border-right: 1px solid #ebebf0;
          display: flex;
          flex-direction: column;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
          position: relative;
        }

        .wm-sidebar::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 1px;
          height: 100%;
          background: linear-gradient(to bottom, #e0e7ff, #f0f0f0, #e0e7ff);
        }

        .wm-logo-area {
          padding: 1.5rem 1.25rem 1rem;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          margin-bottom: 0.5rem;
        }

        .wm-logo-area img {
          width: 130px;
          display: block;
        }

        .wm-nav {
          flex: 1;
          padding: 0.5rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .wm-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0.6rem 0.75rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          transition: background 0.15s ease, color 0.15s ease;
          position: relative;
          letter-spacing: 0.01em;
          text-decoration: none;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
        }

        .wm-nav-item:hover {
          background: #f0f2ff;
          color: #3b4bff;
        }

        .wm-nav-item.active {
          background: #eef0ff;
          color: #3b4bff;
          font-weight: 600;
        }

        .wm-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 20%;
          height: 60%;
          width: 3px;
          background: #3b4bff;
          border-radius: 0 3px 3px 0;
        }

        .wm-nav-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .wm-divider {
          height: 1px;
          background: #f3f4f6;
          margin: 0.5rem 1.25rem;
        }

        .wm-logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0.6rem 0.75rem;
          margin: 0 0.75rem 0.5rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          color: #9ca3af;
          transition: background 0.15s ease, color 0.15s ease;
          border: none;
          background: none;
          width: calc(100% - 1.5rem);
          text-align: left;
          font-family: 'DM Sans', sans-serif;
        }

        .wm-logout-btn:hover {
          background: #fff1f2;
          color: #ef4444;
        }

        .wm-user-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .wm-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b4bff, #7c8cff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          letter-spacing: 0.05em;
        }

        .wm-user-info {
          overflow: hidden;
        }

        .wm-user-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .wm-user-email {
          font-size: 0.7rem;
          color: #9ca3af;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>

      <div className="wm-sidebar">
        {/* Logo */}
        <div className="wm-logo-area" onClick={() => navigate("/profile")}>
          <img src={wmLogo} alt="WorkMate" />
        </div>

        {/* Nav Items */}
        <nav className="wm-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                className={`wm-nav-item${isActive ? " active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <span className="wm-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="wm-divider" />

        {/* Logout */}
        <button className="wm-logout-btn" onClick={onLogout}>
          <span className="wm-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          Logout
        </button>

        {/* User Footer */}
        <div className="wm-user-footer">
          <div className="wm-avatar">{initials}</div>
          <div className="wm-user-info">
            <div className="wm-user-name">{name}</div>
            <div className="wm-user-email">{email}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
