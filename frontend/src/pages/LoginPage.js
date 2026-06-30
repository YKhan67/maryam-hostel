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
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={logoImg} alt="Logo" style={{ height: '64px', marginBottom: '16px' }} />
          <h1 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
            Maryam Hostel
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Management & Student Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 700, color: 'var(--secondary)', marginBottom: '8px' }}>
              Username
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. admin_01"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 700, color: 'var(--secondary)', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: '14px', fontSize: '1rem' }}
            disabled={submitting}
          >
            {submitting ? "Authenticating..." : "Sign In"}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            © {new Date().getFullYear()} Maryam Hostel Management. <br/> All rights reserved.
          </p>
        </form>
      </div>
    </div>
  );
}
