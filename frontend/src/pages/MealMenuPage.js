// src/pages/MealMenuPage.js
import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";

export default function MealMenuPage() {
  const { user } = useContext(AuthContext);
  const [todayMenu, setTodayMenu] = useState([]);
  const [weekMenu, setWeekMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ menuId: null, rating: 0, comment: "" });

  const isStudent = user?.role === "STUDENT";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    loadMenus();
  }, []);

  async function loadMenus() {
    setLoading(true);
    try {
      const [todayRes, weekRes] = await Promise.all([
        api.get("food/daily-menu/today/"),
        api.get("food/daily-menu/week/"),
      ]);
      setTodayMenu(todayRes.data || []);
      setWeekMenu(weekRes.data || []);
    } catch (err) {
      console.error("Error loading menus:", err);
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback() {
    if (!feedbackData.rating) return alert("Please select a rating.");
    try {
      await api.post(`food/daily-menu/${feedbackData.menuId}/feedback/`, {
        rating: feedbackData.rating,
        comment: feedbackData.comment,
      });
      alert("✅ Thank you for your feedback!");
      setShowFeedback(false);
      setFeedbackData({ menuId: null, rating: 0, comment: "" });
    } catch (err) {
      console.error("Error submitting feedback:", err);
      alert("Failed to submit feedback. Please try again.");
    }
  }

  const getMealEmoji = (type) => {
    const map = { BREAKFAST: "🌅", BRUNCH: "🌤️", LUNCH: "☀️", SNACKS: "🍪", DINNER: "🌙" };
    return map[type] || "🍽️";
  };

  const getMealColor = (type) => {
    const map = { BREAKFAST: "#fbbf24", BRUNCH: "#f59e0b", LUNCH: "#f97316", SNACKS: "#8b5cf6", DINNER: "#1e293b" };
    return map[type] || "#64748b";
  };

  // Group today's menu by hostel
  const groupedTodayMenu = todayMenu.reduce((acc, item) => {
    const hostelName = item.hostel_name || "Unknown Hostel";
    if (!acc[hostelName]) acc[hostelName] = [];
    acc[hostelName].push(item);
    return acc;
  }, {});

  // Group week menu by date and hostel
  const groupedWeekMenu = weekMenu.reduce((acc, item) => {
    const date = item.date;
    const hostelName = item.hostel_name || "Unknown Hostel";
    const key = `${date}-${hostelName}`;
    if (!acc[key]) {
      acc[key] = { date, hostelName, items: [] };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const weekKeys = Object.keys(groupedWeekMenu).sort();

  if (loading)
    return (
      <div className="page management-page">
        <div className="card" style={{ textAlign: "center", padding: "60px" }}>
          <p>Loading Menu...</p>
        </div>
      </div>
    );

  return (
    <div className="page management-page">
      {/* Hero Section */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "#fff",
          marginBottom: "32px",
          padding: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>🍽️ Meal Menu</h1>
            <p style={{ opacity: 0.9, marginTop: "8px", fontSize: "1.1rem" }}>
              {isStudent ? "See what's cooking today!" : isSuperAdmin ? "All Hostels - Meal Overview" : "Manage meal plans and grocery requirements"}
            </p>
          </div>
          {isStudent && (
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                padding: "8px 16px",
                borderRadius: "999px",
                fontSize: "0.9rem",
              }}
            >
              ⭐ Rate your meals!
            </div>
          )}
        </div>
      </div>

      {/* Today's Menu - Grouped by Hostel */}
      <h2 style={{ marginBottom: "16px" }}>Today's Menu</h2>
      
      {Object.keys(groupedTodayMenu).length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>
            No meals scheduled for today 🍽️
          </p>
        </div>
      ) : (
        Object.keys(groupedTodayMenu).map((hostelName) => (
          <div key={hostelName} style={{ marginBottom: "32px" }}>
            <h3 style={{ 
              marginBottom: "12px", 
              fontSize: "1rem", 
              color: "var(--brand-gold)",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              🏠 {hostelName}
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              {groupedTodayMenu[hostelName].map((item) => (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    borderTop: `4px solid ${getMealColor(item.meal_type)}`,
                    padding: "16px",
                    position: "relative",
                  }}
                >
                  {item.is_featured && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "#fbbf24",
                        color: "#92400e",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "0.6rem",
                        fontWeight: 800,
                      }}
                    >
                      ⭐ FEATURED
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontSize: "2rem" }}>{getMealEmoji(item.meal_type)}</span>
                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, opacity: 0.6 }}>
                        {item.meal_type_display || item.meal_type}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                        {item.meal_details?.name || item.meal_name}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    {item.meal_details?.description || item.meal?.description}
                  </div>
                  {item.meal_details?.dietary_tags && (
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        marginTop: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      {item.meal_details.dietary_tags.split(",").map((tag, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: "0.5rem",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: "#e2e8f0",
                            color: "#475569",
                          }}
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  {isStudent && (
                    <button
                      onClick={() => {
                        setFeedbackData({ menuId: item.id, rating: 0, comment: "" });
                        setShowFeedback(true);
                      }}
                      className="btn btn-soft"
                      style={{ marginTop: "12px", width: "100%", fontSize: "0.75rem" }}
                    >
                      ⭐ Rate this meal
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Weekly Preview - Grouped by Date and Hostel */}
      <h2 style={{ marginBottom: "16px", marginTop: "32px" }}>Weekly Preview</h2>
      <div className="card" style={{ padding: "24px" }}>
        {weekKeys.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {weekKeys.map((key) => {
              const { date, hostelName, items } = groupedWeekMenu[key];
              return (
                <div
                  key={key}
                  style={{
                    background: "#f8fafc",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: "4px",
                      fontSize: "0.9rem",
                    }}
                  >
                    {new Date(date).toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                    🏠 {hostelName}
                  </div>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 0",
                        borderBottom: "1px solid #e2e8f0",
                        fontSize: "0.85rem",
                      }}
                    >
                      <span>{getMealEmoji(item.meal_type)}</span>
                      <span style={{ fontWeight: 600, flex: 1 }}>
                        {item.meal_details?.name || item.meal_name}
                      </span>
                      <span style={{ fontSize: "0.6rem", opacity: 0.6 }}>
                        {item.meal_type_display || item.meal_type}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            No menu planned for this week yet.
          </p>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedback && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: "400px", width: "90%", padding: "32px" }}>
            <h3 style={{ marginBottom: "16px" }}>Rate Your Meal ⭐</h3>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFeedbackData({ ...feedbackData, rating: star })}
                  style={{
                    fontSize: "2rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    opacity: feedbackData.rating >= star ? 1 : 0.3,
                    transition: "all 0.2s",
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>
            <textarea
              className="form-input"
              placeholder="Any comments about the meal?"
              rows="3"
              value={feedbackData.comment}
              onChange={(e) =>
                setFeedbackData({ ...feedbackData, comment: e.target.value })
              }
              style={{ marginBottom: "16px" }}
            />
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={submitFeedback} className="btn btn-primary" style={{ flex: 1 }}>
                Submit Feedback
              </button>
              <button
                onClick={() => setShowFeedback(false)}
                className="btn btn-soft"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}