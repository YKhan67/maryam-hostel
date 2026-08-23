// src/pages/StaffTasksPage.js
import React, { useEffect, useState } from "react";
import api from "../api";
import { usePermissions } from "../hooks/usePermissions";

export default function StaffTasksPage() {
  const { check } = usePermissions();
  const isReadOnly = !check("TASKS", "edit");

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await api.get("communication/tickets/");
      setTickets(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.patch(`communication/tickets/${id}/`, { status });
      loadTickets();
    } catch (err) {
      alert("Failed to update status");
    }
  }

  if (loading) return <p>Loading tasks...</p>;

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: '24px' }}>Active Assignments</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Subject</th>
                <th>Student</th>
                <th>Status</th>
                <th>Created</th>
                {!isReadOnly && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td>
                    <span className={`badge ${t.category === 'EMERGENCY' ? 'badge-danger' : 'badge-warning'}`}>
                      {t.category}
                    </span>
                  </td>
                  <td>{t.subject}</td>
                  <td>{t.student_name}</td>
                  <td>
                    <span className={`badge ${t.status === 'RESOLVED' ? 'badge-success' : ''}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>{new Date(t.created_at).toLocaleString()}</td>
                  {!isReadOnly && (
                    <td>
                      {t.status !== 'RESOLVED' && (
                        <button
                          onClick={() => updateStatus(t.id, 'RESOLVED')}
                          className="btn btn-primary"
                          style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                        >
                          Mark Fixed
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>No active tasks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
