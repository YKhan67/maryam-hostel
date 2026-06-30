// src/pages/FeeDashboardPage.js

import React, { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../api";

function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(v)) return "Rs 0";
  const num = Number(v);
  return `Rs ${num.toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
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
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_NAMES_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function FeeDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // selection in dropdown
  const [view, setView] = useState("current"); // "current" | "ytd" | "range-3" | "range-6" | "range-12"

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
      {
        value: "current",
        label: `Current month – ${longName} ${y}`,
      },
      {
        value: "ytd",
        label: `Year to date – ${y}`,
      },
      {
        value: "range-3",
        label: buildRangeLabel(3),
      },
      {
        value: "range-6",
        label: buildRangeLabel(6),
      },
      {
        value: "range-12",
        label: buildRangeLabel(12),
      },
    ];
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      let mode = "current";
      let months = undefined;

      if (view === "ytd") {
        mode = "ytd";
      } else if (view.startsWith("range-")) {
        mode = "range";
        const parts = view.split("-");
        const n = Number(parts[1] || 3);
        months = Number.isFinite(n) && n > 0 ? n : 3;
      }

      try {
        const params = { mode };
        if (mode === "range" && months) {
          params.months = months;
        }

        const resp = await api.get("/fees/dashboard/current-month/", {
          params,
        });

        if (isMounted) {
          setData(resp.data);
        }
      } catch (err) {
        console.error("Failed to load fee dashboard", err);
        if (isMounted) {
          setError(
            err.response?.data?.detail ||
              err.message ||
              "Failed to load fee dashboard."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [view]);

  const handleViewChange = (e) => {
    setView(e.target.value);
  };

  // small subtitle for the selected period (uses backend label + range)
  let rangeText = "";
  if (data) {
    if (data.mode === "current") {
      rangeText = `Current month – ${data.label}`;
    } else if (data.mode === "ytd") {
      rangeText = `Year to date – ${data.label}`;
    } else if (data.mode === "range") {
      rangeText = `${data.label} (${data.from} to ${data.to})`;
    }
  }

  return (
    <AppShell subtitle="Fee Dashboard">
      <div className="page management-page">
        {/* Filter bar */}
        <div className="card">
          <div className="card-title">View Options</div>
          <div className="filters-row" style={{ marginTop: 8 }}>
            <div className="filter-group">
              <label className="filter-label">KPI range</label>
              <select
                className="filter-select"
                value={view}
                onChange={handleViewChange}
              >
                {viewOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {rangeText && (
            <div
              className="card-subtext"
              style={{ marginTop: 8, fontStyle: "italic" }}
            >
              {rangeText}
            </div>
          )}
        </div>

        {loading && (
          <div className="card">
            <p>Loading fee dashboard…</p>
          </div>
        )}

        {!loading && error && (
          <div className="card">
            <p style={{ color: "#b91c1c" }}>{String(error)}</p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="cards-row">
              <div className="card kpi-card">
                <div className="card-title">
                  Total Billed ({data.label || ""})
                </div>
                <div className="card-value">
                  {formatCurrency(data.total_billed)}
                </div>
                <div className="card-subtext">
                  Sum of all monthly fee amounts in the selected period
                </div>
              </div>

              <div className="card kpi-card">
                <div className="card-title">Total Collected</div>
                <div className="card-value">
                  {formatCurrency(data.total_collected)}
                </div>
                <div className="card-subtext">
                  Fees marked as paid in the selected period
                </div>
              </div>

              <div className="card kpi-card">
                <div className="card-title">Total Outstanding</div>
                <div className="card-value">
                  {formatCurrency(data.total_outstanding)}
                </div>
                <div className="card-subtext">
                  Still to be collected from students
                </div>
              </div>
            </div>

            <div className="cards-row">
              <div className="card kpi-card">
                <div className="card-title">Fine Collected</div>
                <div className="card-value">
                  {formatCurrency(data.fine_collected)}
                </div>
                <div className="card-subtext">
                  Late fee already charged on paid records
                </div>
              </div>

              <div className="card kpi-card">
                <div className="card-title">Fine Outstanding</div>
                <div className="card-value">
                  {formatCurrency(data.fine_outstanding)}
                </div>
                <div className="card-subtext">
                  Estimated late fee on unpaid records (up to today)
                </div>
              </div>

              <div className="card kpi-card">
                <div className="card-title">Total Fine (Collected + Pending)</div>
                <div className="card-value">
                  {formatCurrency(data.total_fine)}
                </div>
                <div className="card-subtext">
                  Overall impact of fines for the selected period
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
