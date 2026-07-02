// src/pages/QuickLogPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import api from "../api";

export default function QuickLogPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItem();
  }, [itemId]);

  async function loadItem() {
    try {
      const res = await api.get(`items/${itemId}/`);
      setItem(res.data);
    } catch (err) {
      console.error("Failed to load item", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!quantity) return alert("Please enter quantity");

    setSubmitting(true);
    const formData = new FormData();
    formData.append("item", itemId);
    formData.append("quantity", quantity);
    formData.append("remarks", remarks);
    formData.append("date", new Date().toISOString().split('T')[0]);
    if (photo) formData.append("photo", photo);

    // Auto-detect hostel from user profile
    // This assumes the staff member is assigned to a specific hostel
    try {
      await api.post("consumptions/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("Stock removal logged successfully!");
      navigate("/inventory");
    } catch (err) {
      alert("Failed to log consumption. Ensure you have selected a hostel if required.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <AppShell subtitle="Quick Log">Identifying item...</AppShell>;
  if (!item) return <AppShell subtitle="Quick Log">Item not found.</AppShell>;

  return (
    <AppShell subtitle={`Quick Log: ${item.name}`}>
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
          <h2 style={{ margin: 0 }}>{item.name}</h2>
          <p style={{ color: 'var(--text-muted)' }}>Scan recorded: {new Date().toLocaleTimeString()}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Quantity Removed ({item.unit_name})</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="e.g. 5.5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Add Proof Photo (Optional)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhoto(e.target.files[0])}
              className="form-input"
              style={{ padding: '8px' }}
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Tip: On mobile, this will open your camera automatically.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea
              className="form-input"
              placeholder="e.g. For dinner prep"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows="2"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '16px', fontSize: '1rem' }}
            disabled={submitting}
          >
            {submitting ? "Saving Log..." : "Confirm Stock Removal"}
          </button>

          <button
            type="button"
            className="btn btn-soft"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Cancel
          </button>
        </form>
      </div>
    </AppShell>
  );
}
