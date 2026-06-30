import { formatPKR } from "../utils/formatPKR";
import React, { useContext, useEffect, useState } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import AppShell from "../components/AppShell";

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFeeId, setUploadingFeeId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchFees();
  }, []);

  function fetchFees() {
    setLoading(true);
    api
      .get("/monthly_fees/")
      .then((res) => setFees(res.data))
      .catch((err) => console.error("Error fetching fees:", err))
      .finally(() => setLoading(false));
  }

  async function handleFileChange(e, feeId) {
    const file = e.target.files[0];
    if (!file) return;

    setMessage("");
    setUploadingFeeId(feeId);

    try {
      const formData = new FormData();
      formData.append("fee", feeId);
      formData.append("file", file);

      await api.post("/payment_proofs/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(
        "Payment proof uploaded successfully. Management will review and mark it as paid."
      );
    } catch (err) {
      console.error("Error uploading payment proof:", err);
      setMessage("Failed to upload payment proof. Please try again.");
    } finally {
      setUploadingFeeId(null);
      e.target.value = "";
    }
  }

  const unpaidCount = fees.filter((f) => !f.is_paid).length;
  const totalDue = fees
    .filter((f) => !f.is_paid)
    .reduce((sum, f) => sum + Number(f.amount || 0) + Number(f.late_fee_applied || 0), 0);

  return (
    <AppShell subtitle="Student Portal">
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title">
            Welcome, {user?.username}
          </div>
          <div className="card-subtitle">
            Overview of your current hostel dues and payments.
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: "1 1 160px", marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: "0.85rem" }}>
              Outstanding invoices
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              {unpaidCount}
            </div>
          </div>
          <div className="card" style={{ flex: "1 1 160px", marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: "0.85rem" }}>
              Total due (incl. late fees)
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              {formatPKR(totalDue)}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">My Monthly Fees</div>
          <div className="card-subtitle">
            Upload proof for any unpaid month to avoid additional late fees.
          </div>
        </div>

        {message && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 10,
              backgroundColor: "#f0f9ff",
              border: "1px solid #bfdbfe",
              fontSize: "0.8rem",
            }}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div>Loading your fees…</div>
        ) : fees.length === 0 ? (
          <div>No fees found.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Fee Head</th>
                  <th>Amount</th>
                  <th>Late Fee</th>
                  <th>Status</th>
                  <th>Payment Proof</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((f) => {
                  const isPaid = f.is_paid;
                  const statusClass = isPaid
                    ? "badge badge-success"
                    : "badge badge-warning";
                  const statusText = isPaid ? "Paid" : "Pending";

                  return (
                    <tr key={f.id}>
                      <td>{f.month}</td>
                      <td>{f.fee_head_name || f.fee_head}</td>
                      <td>{formatPKR(f.amount)}</td>
                      <td>{formatPKR(f.late_fee_applied)}</td>
                      <td>
                        <span className={statusClass}>{statusText}</span>
                      </td>
                      <td>
                        {isPaid ? (
                          <span className="upload-chip upload-chip-disabled">
                            Proof received
                          </span>
                        ) : (
                          <label className="upload-chip">
                            {uploadingFeeId === f.id ? "Uploading…" : "Upload proof"}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              style={{ display: "none" }}
                              onChange={(e) => handleFileChange(e, f.id)}
                              disabled={uploadingFeeId === f.id}
                            />
                          </label>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
