// src/pages/LoginPage.js
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import logoImg from "../assets/maryam_logo.png";

export default function LoginPage() {
  const { login, error } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    const loggedInUser = await login(username, password);

    setSubmitting(false);

    if (loggedInUser && loggedInUser.role) {
      if (loggedInUser.role === "STUDENT") {
        navigate("/student", { replace: true });
      } else {
        navigate("/management", { replace: true });
      }
    }
    // If null / error, stay on the page and show error from context
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-circle">
            <img src={logoImg} alt="Maryam Hostel Logo" />
          </div>
          <div className="login-title">Maryam Hostel</div>
          <div className="login-subtitle">
            Secure portal for students and management
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 8 }}
            disabled={submitting}
          >
            {submitting ? "Logging in..." : "Login"}
          </button>

          <div className="helper-text" style={{ marginTop: 8 }}>
            Use your hostel credentials provided by Maryam Hostel management.
          </div>
        </form>
      </div>
    </div>
  );
}
