// src/pages/MealFeedbackPage.js
import React, { useEffect, useState } from "react";
import api from "../api";

export default function MealFeedbackPage() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, HIGH, LOW
  const [stats, setStats] = useState({ total: 0, avgRating: 0, totalComments: 0 });

  useEffect(() => {
    loadFeedback();
  }, []);

  async function loadFeedback() {
    setLoading(true);
    try {
      const res = await api.get("food/feedback/");
      const data = res.data.results || res.data || [];
      setFeedback(data);
      
      // Calculate stats
      const total = data.length;
      const avgRating = total > 0 
        ? data.reduce((sum, f) => sum + f.rating, 0) / total 
        : 0;
      const totalComments = data.filter(f => f.comment && f.comment.trim()).length;
      
      setStats({ total, avgRating, totalComments });
    } catch (err) {
      console.error("Error loading feedback:", err);
    } finally {
      setLoading(false);
    }
  }

  const getFilteredFeedback = () => {
    if (filter === "HIGH") {
      return feedback.filter(f => f.rating >= 4);
    }
    if (filter === "LOW") {
      return feedback.filter(f => f.rating <= 2);
    }
    return feedback;
  };

  const renderStars = (rating) => {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  };

  if (loading) {
    return (
      <div className="page management-page">
        <div className="card" style={{ textAlign: "center", padding: "60px" }}>
          <p>Loading Feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page management-page">
      {/* Header */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ margin: 0 }}>⭐ Meal Feedback</h2>
            <p className="card-subtext">See what students think about the meals</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              onClick={() => setFilter("ALL")} 
              className={`btn ${filter === "ALL" ? "btn-primary" : "btn-soft"}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter("HIGH")} 
              className={`btn ${filter === "HIGH" ? "btn-success" : "btn-soft"}`}
            >
              High Rated (4-5⭐)
            </button>
            <button 
              onClick={() => setFilter("LOW")} 
              className={`btn ${filter === "LOW" ? "btn-danger" : "btn-soft"}`}
            >
              Low Rated (1-2⭐)
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="card" style={{ padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, opacity: 0.6, textTransform: "uppercase" }}>Total Feedback</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: "16px", textAlign: "center", background: "#f0fdf4", borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, opacity: 0.6, textTransform: "uppercase" }}>Average Rating</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a" }}>
            {stats.avgRating.toFixed(1)}⭐
          </div>
        </div>
        <div className="card" style={{ padding: "16px", textAlign: "center", background: "#eff6ff", borderLeft: "4px solid #3b82f6" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, opacity: 0.6, textTransform: "uppercase" }}>With Comments</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2563eb" }}>{stats.totalComments}</div>
        </div>
      </div>

      {/* Feedback Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Meal</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredFeedback().length > 0 ? (
                getFilteredFeedback().map((fb) => (
                  <tr key={fb.id}>
                    <td style={{ fontWeight: 600 }}>{fb.student_name || "Unknown"}</td>
                    <td>{fb.meal_name || fb.daily_menu?.meal?.name}</td>
                    <td>
                      <span style={{ fontSize: "0.9rem" }}>{renderStars(fb.rating)}</span>
                      <span style={{ marginLeft: "4px", fontWeight: 700 }}>({fb.rating})</span>
                    </td>
                    <td>{fb.comment || "—"}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    No feedback received yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}