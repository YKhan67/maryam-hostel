// src/pages/ChangePasswordPage.js
import React, { useState } from "react";
import AppShell from "../components/AppShell";
import api from "../api";

export default function ChangePasswordPage() {
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handlePasswordChange(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (passwords.new_password !== passwords.confirm_password) {
      return setError("New passwords do not match.");
    }

    setSubmitting(true);
    try {
      await api.post("change-password/", {
        old_password: passwords.old_password,
        new_password: passwords.new_password
      });
      setMessage("Password updated successfully.");
      setPasswords({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      console.error("Error changing password:", err);
      setError(err.response?.data?.old_password || err.response?.data?.detail || "Failed to update password. Ensure your current password is correct.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell subtitle="Account Security">
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '24px' }}>Change Your Password</h2>

        {message && (
          <div style={{ marginBottom: '20px', padding: '12px', background: '#ecfdf5', color: '#065f46', borderRadius: '10px', fontWeight: 600 }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{ marginBottom: '20px', padding: '12px', background: '#fef2f2', color: '#b91c1c', borderRadius: '10px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={passwords.old_password}
              onChange={e => setPasswords({...passwords, old_password: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              value={passwords.new_password}
              onChange={e => setPasswords({...passwords, new_password: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={passwords.confirm_password}
              onChange={e => setPasswords({...passwords, confirm_password: e.target.value})}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '1rem' }} disabled={submitting}>
            {submitting ? "Processing..." : "Update Password"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
