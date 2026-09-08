// src/pages/FeeDashboardPage.js

import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { saveAs } from "file-saver";

function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(v)) return "Rs 0";
  const num = Number(v);
  return `Rs ${num.toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Helper to shift months on the frontend
function shiftMonth(year, month, delta) {
  // month: 1–12
  const total = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1; // back to 1–12
  return { year: newYear, month: newMonth };
}

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_NAMES_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function FeeDashboardPage() {
  const today = new Date();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // selection in dropdown
  const [view, setView] = useState("current"); // "current" | "ytd" | "range-3" | "range-6" | "range-12" | "custom"
  const [customFromYear, setCustomFromYear] = useState(today.getFullYear());
  const [customFromMonth, setCustomFromMonth] = useState(today.getMonth() + 1);
  const [customToYear, setCustomToYear] = useState(today.getFullYear());
  const [customToMonth, setCustomToMonth] = useState(today.getMonth() + 1);

  // Summary / Student Breakdown tab toggle
  const [activeTab, setActiveTab] = useState("summary"); // "summary" | "breakdown"

  // Student Breakdown filters
  const [bdIsActive, setBdIsActive] = useState("true"); // "true" | "false" | "all"
  const [bdName, setBdName] = useState("");
  const [bdYear, setBdYear] = useState(today.getFullYear());
  const [bdFromMonth, setBdFromMonth] = useState(today.getMonth() + 1);
  const [bdToMonth, setBdToMonth] = useState(today.getMonth() + 1);
  const [bdData, setBdData] = useState(null);
  const [bdLoading, setBdLoading] = useState(false);
  const [bdError, setBdError] = useState(null);
  const [bdExporting, setBdExporting] = useState(null); // null | "csv" | "pdf" | "docx"

  // Build dropdown options INCLUDING month names
  const viewOptions = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1; // 1–12
    const longName = MONTH_NAMES_LONG[m - 1];

    // For N-month ranges, compute start month
    const buildRangeLabel = (monthsBack) => {
      const start = shiftMonth(y, m, -(monthsBack - 1));
      const startName = MONTH_NAMES_SHORT[start.month - 1];
      const endName = MONTH_NAMES_SHORT[m - 1];
      return `Last ${monthsBack} months – ${startName} ${start.year} to ${endName} ${y}`;
    };

    return [
      { value: "current", label: `Current month – ${longName} ${y}` },
      { value: "ytd", label: `Year to date – ${y}` },
      { value: "range-3", label: buildRangeLabel(3) },
      { value: "range-6", label: buildRangeLabel(6) },
      { value: "range-12", label: buildRangeLabel(12) },
      { value: "custom", label: "Custom range…" },
    ];
  }, []);

  async function loadSummary(currentView) {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (currentView === "ytd") {
        params.mode = "ytd";
      } else if (currentView.startsWith("range-")) {
        params.mode = "range";
        const n = Number(currentView.split("-")[1] || 3);
        params.months = Number.isFinite(n) && n > 0 ? n : 3;
      } else if (currentView === "custom") {
        params.mode = "custom";
        params.from_year = customFromYear;
        params.from_month = customFromMonth;
        params.to_year = customToYear;
        params.to_month = customToMonth;
      } else {
        params.mode = "current";
      }
      const resp = await api.get("fees/dashboard/current-month/", { params });
      setData(resp.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load fee dashboard", err);
      setError(err.response?.data?.detail || err.message || "Failed to load fee dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (activeTab !== "breakdown") return;
    let isMounted = true;
    const handle = setTimeout(async () => {
      setBdLoading(true);
      setBdError(null);
      try {
        const params = {
          is_active: bdIsActive,
          year: bdYear,
          from_month: bdFromMonth,
          to_month: bdToMonth,
        };
        if (bdName.trim()) params.name = bdName.trim();
        const resp = await api.get("fees/dashboard/student-breakdown/", { params });
        if (isMounted) setBdData(resp.data);
      } catch (err) {
        console.error("Failed to load student breakdown", err);
        if (isMounted) setBdError(err.response?.data?.error || err.message || "Failed to load student breakdown.");
      } finally {
        if (isMounted) setBdLoading(false);
      }
    }, bdName ? 400 : 0); // debounce only matters for the free-text name field
    return () => { isMounted = false; clearTimeout(handle); };
  }, [activeTab, bdIsActive, bdName, bdYear, bdFromMonth, bdToMonth]);

  async function exportBreakdown(format) {
    setBdExporting(format);
    try {
      const params = {
        is_active: bdIsActive,
        year: bdYear,
        from_month: bdFromMonth,
        to_month: bdToMonth,
        // Backend expects "export_format", not "format" - DRF reserves the
        // "format" query param for its own content-negotiation override
        // (e.g. ?format=json), which was silently 404ing this request
        // during routing before it ever reached the view.
        export_format: format,
      };
      if (bdName.trim()) params.name = bdName.trim();

      const response = await api.get("fees/dashboard/student-breakdown/export/", {
        params,
        responseType: "blob",
      });

      const mimeTypes = {
        csv: "text/csv",
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      const blob = new Blob([response.data], { type: mimeTypes[format] });
      saveAs(blob, `fee_breakdown_${bdYear}_${bdFromMonth}-${bdToMonth}.${format}`);
    } catch (err) {
      console.error(`Failed to export ${format}`, err);
      alert(`Failed to export ${format.toUpperCase()}. Please try again.`);
    } finally {
      setBdExporting(null);
    }
  }

  const handleViewChange = (e) => { setView(e.target.value); };

  const collectionRate = data && data.total_billed > 0
    ? Math.round((data.total_collected / data.total_billed) * 100)
    : null;
  const outstandingIsHigh = collectionRate !== null && collectionRate < 70;

  return (
    <div className="page management-page">
        {/* Summary / Student Breakdown tab toggle */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            onClick={() => setActiveTab("summary")}
            className={`btn ${activeTab === "summary" ? "btn-primary" : "btn-soft"}`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab("breakdown")}
            className={`btn ${activeTab === "breakdown" ? "btn-primary" : "btn-soft"}`}
          >
            Student Breakdown
          </button>
        </div>

        {activeTab === "summary" && (
        <React.Fragment>
        {/* Filter bar */}
        <div className="card">
          <div className="card-title">View Options</div>
          <div className="filters-row" style={{ marginTop: 8, display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="filter-group">
              <label className="filter-label">KPI range</label>
              <select className="filter-select" value={view} onChange={handleViewChange}>
                {viewOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {view === "custom" && (
              <React.Fragment>
                <div className="filter-group">
                  <label className="filter-label">From</label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <select className="filter-select" value={customFromMonth} onChange={(e) => setCustomFromMonth(parseInt(e.target.value))}>
                      {MONTH_NAMES_LONG.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <input type="number" className="filter-input" style={{ width: "90px" }} value={customFromYear} onChange={(e) => setCustomFromYear(parseInt(e.target.value) || today.getFullYear())} />
                  </div>
                </div>
                <div className="filter-group">
                  <label className="filter-label">To</label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <select className="filter-select" value={customToMonth} onChange={(e) => setCustomToMonth(parseInt(e.target.value))}>
                      {MONTH_NAMES_LONG.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <input type="number" className="filter-input" style={{ width: "90px" }} value={customToYear} onChange={(e) => setCustomToYear(parseInt(e.target.value) || today.getFullYear())} />
                  </div>
                </div>
                <button onClick={() => loadSummary("custom")} className="btn btn-primary" disabled={loading}>
                  Apply
                </button>
              </React.Fragment>
            )}
          </div>
          {data && (
            <div className="card-subtext" style={{ marginTop: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <span><b>{data.label}</b> ({data.from} to {data.to})</span>
              {lastUpdated && <span style={{ opacity: 0.7 }}>Last updated {lastUpdated.toLocaleTimeString()}</span>}
            </div>
          )}
        </div>

        {loading && (
          <div className="cards-row">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card kpi-card" style={{ opacity: 0.5 }}>
                <div className="card-title">Loading…</div>
                <div className="card-value">—</div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="card">
            <p style={{ color: "#b91c1c" }}>{String(error)}</p>
          </div>
        )}

        {!loading && !error && data && (
          <React.Fragment>
            <div className="card-title" style={{ margin: "20px 0 8px" }}>💰 Billing</div>
            <div className="cards-row">
              <div className="card kpi-card">
                <div className="card-title">Total Billed</div>
                <div className="card-value">{formatCurrency(data.total_billed)}</div>
                <div className="card-subtext">Sum of all monthly fee amounts in the selected period</div>
              </div>
              <div className="card kpi-card">
                <div className="card-title">Total Collected</div>
                <div className="card-value" style={{ color: "#15803d" }}>{formatCurrency(data.total_collected)}</div>
                <div className="card-subtext">Fees marked as paid in the selected period</div>
              </div>
              <div className="card kpi-card" style={{ border: outstandingIsHigh ? "1px solid #fecaca" : undefined, background: outstandingIsHigh ? "#fef2f2" : undefined }}>
                <div className="card-title">⚠️ Total Outstanding</div>
                <div className="card-value" style={{ fontSize: "1.6rem", color: outstandingIsHigh ? "#b91c1c" : "#b45309" }}>{formatCurrency(data.total_outstanding)}</div>
                <div className="card-subtext">Still to be collected from students</div>
              </div>
            </div>

            {collectionRate !== null && (
              <div className="card" style={{ marginTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                  <span>Collection rate</span>
                  <span style={{ fontWeight: 700 }}>{collectionRate}%</span>
                </div>
                <div style={{ height: "10px", background: "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(collectionRate, 100)}%`,
                    height: "100%",
                    background: outstandingIsHigh ? "#dc2626" : "#16a34a",
                    borderRadius: "6px",
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
            )}

            <div className="card-title" style={{ margin: "24px 0 8px" }}>🔔 Fines</div>
            <div className="cards-row">
              <div className="card kpi-card">
                <div className="card-title">Fine Collected</div>
                <div className="card-value">{formatCurrency(data.fine_collected)}</div>
                <div className="card-subtext">Late fee already charged on paid records</div>
              </div>
              <div className="card kpi-card">
                <div className="card-title">Fine Outstanding</div>
                <div className="card-value">{formatCurrency(data.fine_outstanding)}</div>
                <div className="card-subtext">Estimated late fee on unpaid records (up to today)</div>
              </div>
              <div className="card kpi-card">
                <div className="card-title">Total Fine</div>
                <div className="card-value">{formatCurrency(data.total_fine)}</div>
                <div className="card-subtext">Collected + pending, for the selected period</div>
              </div>
            </div>

            <div className="card-title" style={{ margin: "24px 0 8px" }}>👥 Payment Behavior</div>
            <div className="cards-row">
              <div className="card kpi-card">
                <div className="card-title">✅ Paid On Time</div>
                <div className="card-value" style={{ color: "#15803d" }}>{data.students_paid_on_time ?? 0}</div>
                <div className="card-subtext">Students who paid with no late fee</div>
              </div>
              <div className="card kpi-card">
                <div className="card-title">⏰ Paid With Late Fee</div>
                <div className="card-value" style={{ color: "#b45309" }}>{data.students_paid_with_late_fee ?? 0}</div>
                <div className="card-subtext">Students who paid, including a late fee</div>
              </div>
              <div className="card kpi-card">
                <div className="card-title">🤝 Fine Waived</div>
                <div className="card-value">{data.students_fine_waived ?? 0}</div>
                <div className="card-subtext">Students whose late fee was waived</div>
              </div>
            </div>
          </React.Fragment>
        )}
        </React.Fragment>
        )}

        {activeTab === "breakdown" && (
        <React.Fragment>
          {/* Filter bar */}
          <div className="card">
            <div className="card-title">Filters</div>
            <div className="filters-row" style={{ marginTop: 8, display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div className="filter-group">
                <label className="filter-label">Active</label>
                <select className="filter-select" value={bdIsActive} onChange={(e) => setBdIsActive(e.target.value)}>
                  <option value="true">Active only</option>
                  <option value="false">Inactive only</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Student name</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Search by name…"
                  value={bdName}
                  onChange={(e) => setBdName(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label className="filter-label">Year</label>
                <input
                  type="number"
                  className="filter-input"
                  style={{ width: "100px" }}
                  value={bdYear}
                  onChange={(e) => setBdYear(parseInt(e.target.value) || today.getFullYear())}
                />
              </div>
              <div className="filter-group">
                <label className="filter-label">From month</label>
                <select className="filter-select" value={bdFromMonth} onChange={(e) => setBdFromMonth(parseInt(e.target.value))}>
                  {MONTH_NAMES_LONG.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">To month</label>
                <select className="filter-select" value={bdToMonth} onChange={(e) => setBdToMonth(parseInt(e.target.value))}>
                  {MONTH_NAMES_LONG.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {bdLoading && (
            <div className="card">
              <p>Loading student breakdown…</p>
            </div>
          )}

          {!bdLoading && bdError && (
            <div className="card">
              <p style={{ color: "#b91c1c" }}>{String(bdError)}</p>
            </div>
          )}

          {!bdLoading && !bdError && bdData && (
            <div className="card table-card" style={{ padding: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <span><span style={{ fontWeight: 700 }}>{bdData.count}</span> record{bdData.count === 1 ? "" : "s"}</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => exportBreakdown("csv")} className="btn btn-soft" disabled={!!bdExporting || bdData.count === 0} style={{ fontSize: "0.8rem" }}>
                    {bdExporting === "csv" ? "Exporting…" : "📄 CSV"}
                  </button>
                  <button onClick={() => exportBreakdown("pdf")} className="btn btn-soft" disabled={!!bdExporting || bdData.count === 0} style={{ fontSize: "0.8rem" }}>
                    {bdExporting === "pdf" ? "Exporting…" : "📕 PDF"}
                  </button>
                  <button onClick={() => exportBreakdown("docx")} className="btn btn-soft" disabled={!!bdExporting || bdData.count === 0} style={{ fontSize: "0.8rem" }}>
                    {bdExporting === "docx" ? "Exporting…" : "📘 Word"}
                  </button>
                </div>
              </div>
              <div className="table-wrapper" style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>NIC</th>
                      <th>Month</th>
                      <th>Amount Due</th>
                      <th>Due Date</th>
                      <th>Utility</th>
                      <th>Fine</th>
                      <th>Amount Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bdData.rows.length === 0 && (
                      <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px" }}>No records for this filter.</td></tr>
                    )}
                    {bdData.rows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{row.student_name}</td>
                        <td>{row.nic_number || "—"}</td>
                        <td>{row.month}</td>
                        <td style={{ fontWeight: 700, color: row.amount_due > 0 ? "#b45309" : "inherit" }}>{formatCurrency(row.amount_due)}</td>
                        <td>{formatDate(row.due_date)}</td>
                        <td>{formatCurrency(row.utility_bill)}</td>
                        <td style={{ color: row.fine > 0 ? "#b91c1c" : "inherit" }}>{formatCurrency(row.fine)}</td>
                        <td>{formatCurrency(row.amount_paid)}</td>
                        <td>
                          <span className={`badge ${row.status === "PAID" ? "badge-success" : "badge-danger"}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </React.Fragment>
        )}
    </div>
  );
}
