// src/pages/GroceryManagementPage.js
import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import { formatPKR } from "../utils/formatPKR";
import { saveAs } from "file-saver";

export default function GroceryManagementPage() {
  const { user } = useContext(AuthContext);
  const [groceryItems, setGroceryItems] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateData, setGenerateData] = useState({
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    servings_per_person: 1,
    waste_factor: 0.015, // 1.5% default
  });
  const [generating, setGenerating] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isManager = user?.role === "HOSTEL_MANAGER" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    loadData();
    loadHostels();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.get("food/grocery/");
      setGroceryItems(res.data.results || res.data || []);
    } catch (err) {
      console.error("Error loading grocery data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadHostels() {
    try {
      const res = await api.get("hostels/");
      setHostels(res.data.results || res.data || []);
      if (res.data.length > 0) {
        setSelectedHostel(res.data[0].id);
      }
    } catch (err) {
      console.error("Error loading hostels:", err);
    }
  }

  async function generateGroceryList() {
    if (!selectedHostel) {
      alert("Please select a hostel.");
      return;
    }
    setGenerating(true);
    try {
      const response = await api.post("food/grocery/generate/", {
        hostel: selectedHostel,
        start_date: generateData.start_date,
        end_date: generateData.end_date,
        servings_per_person: generateData.servings_per_person,
        waste_factor: generateData.waste_factor,
      });
      
      const data = response.data;
      if (data.error) {
        alert(data.error);
      } else {
        alert(`✅ Generated ${data.items_created} grocery items!\n\n` +
              `🏠 Hostel: ${data.hostel}\n` +
              `👥 Active Students: ${data.active_students}\n` +
              `🍽️ Total Meals: ${data.total_meals}\n` +
              `📅 Period: ${data.date_range}\n` +
              `🍽️ Servings: ${data.servings_per_person} per person\n` +
              `📊 Waste Factor: ${(data.global_waste_factor || generateData.waste_factor) * 100}%`);
      }
      setShowGenerateModal(false);
      loadData();
    } catch (err) {
      console.error("Error generating grocery list:", err);
      alert("Failed to generate grocery list.");
    } finally {
      setGenerating(false);
    }
  }

  async function updateStatus(id, status, notes = "") {
    try {
      await api.patch(`food/grocery/${id}/`, { status, notes });
      loadData();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status.");
    }
  }

  async function approveSelected() {
    if (selectedItems.length === 0) {
      alert("Please select items to approve.");
      return;
    }
    for (const id of selectedItems) {
      await updateStatus(id, "APPROVED");
    }
    setSelectedItems([]);
    setShowApproveModal(false);
    alert(`✅ Approved ${selectedItems.length} items!`);
  }

  async function rejectSelected() {
    if (selectedItems.length === 0) {
      alert("Please select items to reject.");
      return;
    }
    for (const id of selectedItems) {
      await updateStatus(id, "REJECTED", rejectReason);
    }
    setSelectedItems([]);
    setRejectReason("");
    setShowRejectModal(false);
    alert(`❌ Rejected ${selectedItems.length} items!`);
  }

  const toggleSelect = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'DRAFT': { class: 'badge-soft', label: '📝 Draft' },
      'PENDING': { class: 'badge-warning', label: '⏳ Pending' },
      'APPROVED': { class: 'badge-success', label: '✅ Approved' },
      'PURCHASED': { class: 'badge-info', label: '🛒 Purchased' },
      'REJECTED': { class: 'badge-danger', label: '❌ Rejected' },
    };
    return map[status] || map['PENDING'];
  };

  const filteredItems = groceryItems.filter(item => {
    if (filterStatus !== "ALL" && item.status !== filterStatus) return false;
    if (selectedHostel && item.hostel !== parseInt(selectedHostel)) return false;
    return true;
  });

  const totalEstimatedCost = filteredItems.reduce((sum, item) => sum + (parseFloat(item.estimated_cost) || 0), 0);

  if (loading) {
    return (
      <div className="page management-page">
        <div className="card" style={{ textAlign: "center", padding: "60px" }}>
          <p>Loading Grocery Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page management-page">
      {/* Header */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>🛒 Grocery Management</h2>
            <p className="card-subtext">Generate and manage grocery lists from meal plans</p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button 
              onClick={() => setShowGenerateModal(true)} 
              className="btn btn-primary"
              disabled={!isManager}
            >
              📋 Generate Grocery List
            </button>
            <button 
              onClick={() => {
                if (selectedItems.length === 0) {
                  alert("Please select items first.");
                  return;
                }
                setShowApproveModal(true);
              }} 
              className="btn btn-success"
              disabled={!isManager || selectedItems.length === 0}
            >
              ✅ Approve Selected ({selectedItems.length})
            </button>
            <button 
              onClick={() => {
                if (selectedItems.length === 0) {
                  alert("Please select items first.");
                  return;
                }
                setShowRejectModal(true);
              }} 
              className="btn btn-danger"
              disabled={!isManager || selectedItems.length === 0}
            >
              ❌ Reject Selected ({selectedItems.length})
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PURCHASED">Purchased</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Hostel</label>
            <select
              className="filter-select"
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value)}
            >
              <option value="">All Hostels</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginLeft: "auto", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Total Estimated Cost: <strong>{formatPKR(totalEstimatedCost)}</strong>
          </div>
        </div>
      </div>

      {/* Grocery Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Item</th>
                <th>Hostel</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Estimated Cost</th>
                <th>Actual Cost</th>
                <th>Period</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        disabled={item.status === "PURCHASED" || item.status === "REJECTED"}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                    <td>{item.hostel_name}</td>
                    <td>{parseFloat(item.quantity_needed).toFixed(2)}</td>
                    <td>{item.unit}</td>
                    <td>{formatPKR(item.estimated_cost)}</td>
                    <td>
                      {item.actual_cost ? formatPKR(item.actual_cost) : "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>
                      {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(item.status).class}`}>
                        {getStatusBadge(item.status).label}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {item.status === "APPROVED" && (
                          <button
                            onClick={() => updateStatus(item.id, "PURCHASED")}
                            className="btn btn-primary"
                            style={{ fontSize: "0.65rem", padding: "4px 8px" }}
                          >
                            🛒 Mark Purchased
                          </button>
                        )}
                        {item.status === "PENDING" && isManager && (
                          <>
                            <button
                              onClick={() => updateStatus(item.id, "APPROVED")}
                              className="btn btn-success"
                              style={{ fontSize: "0.65rem", padding: "4px 8px" }}
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt("Reason for rejection:");
                                if (reason !== null) {
                                  updateStatus(item.id, "REJECTED", reason);
                                }
                              }}
                              className="btn btn-danger"
                              style={{ fontSize: "0.65rem", padding: "4px 8px" }}
                            >
                              ❌ Reject
                            </button>
                          </>
                        )}
                        {item.status === "REJECTED" && (
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                            Rejected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    No grocery items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
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
          <div className="card" style={{ maxWidth: "450px", width: "90%", padding: "32px" }}>
            <h3 style={{ marginBottom: "16px" }}>📋 Generate Grocery List</h3>
            <form onSubmit={(e) => { e.preventDefault(); generateGroceryList(); }}>
              <div className="form-group">
                <label className="form-label">Hostel</label>
                <select
                  className="form-input"
                  required
                  value={selectedHostel}
                  onChange={(e) => setSelectedHostel(e.target.value)}
                >
                  <option value="">Select Hostel</option>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={generateData.start_date}
                  onChange={(e) => setGenerateData({ ...generateData, start_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={generateData.end_date}
                  onChange={(e) => setGenerateData({ ...generateData, end_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Servings Per Person Per Meal</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  step="1"
                  value={generateData.servings_per_person}
                  onChange={(e) => setGenerateData({ ...generateData, servings_per_person: parseInt(e.target.value) || 1 })}
                />
                <small style={{ color: "var(--text-muted)" }}>Default: 1 serving per person</small>
              </div>
              <div className="form-group">
                <label className="form-label">Waste Factor (%)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="5"
                  step="0.1"
                  value={generateData.waste_factor ? (generateData.waste_factor * 100).toFixed(1) : 1.5}
                  onChange={(e) => setGenerateData({ 
                    ...generateData, 
                    waste_factor: parseFloat(e.target.value) / 100 || 0.015 
                  })}
                />
                <small style={{ color: "var(--text-muted)" }}>
                  Default: 1.5%. Recommended: 1-2% for most ingredients
                </small>
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={generating}>
                  {generating ? "Generating..." : "Generate"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="btn btn-soft"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
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
            <h3 style={{ marginBottom: "16px" }}>✅ Approve Items</h3>
            <p>Are you sure you want to approve {selectedItems.length} items?</p>
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button onClick={approveSelected} className="btn btn-success" style={{ flex: 1 }}>
                Yes, Approve
              </button>
              <button
                onClick={() => setShowApproveModal(false)}
                className="btn btn-soft"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
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
            <h3 style={{ marginBottom: "16px" }}>❌ Reject Items</h3>
            <p>Rejecting {selectedItems.length} items.</p>
            <div className="form-group">
              <label className="form-label">Reason (Optional)</label>
              <textarea
                className="form-input"
                rows="2"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why are these items being rejected?"
              />
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button onClick={rejectSelected} className="btn btn-danger" style={{ flex: 1 }}>
                Yes, Reject
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
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