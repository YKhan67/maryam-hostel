// src/pages/FeeKpiPage.js

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

export default function FeeKpiPage() {
  // Last 3 months detailed KPIs
  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState(null);

  // Summary (YTD / last 3 / 6 / 12 months)
  const [summaryView, setSummaryView] = useState("ytd"); // "ytd" | "3" | "6" | "12"
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  // ─────────────────────────────────
  // 1) Last 3 months KPI list (month-by-month)
  // ─────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadMonthly() {
      setMonthlyLoading(true);
      setMonthlyError(null);
      try {
        const resp = await api.get("/fees/dashboard/last-three-months/");
        let data = resp.data;
        if (!Array.isArray(data)) {
          throw new Error("Unexpected response format from /fees/dashboard/last-three-months/");
        }
        if (isMounted) setMonthlyData(data);
      } catch (err) {
        console.error("Failed to load last-three-months fee KPIs", err);
        if (isMounted) {
          setMonthlyError(
            err.response?.data?.detail ||
              err.message ||
              "Failed to load fee KPIs."
          );
        }
      } finally {
        if (isMounted) setMonthlyLoading(false);
      }
    }

    loadMonthly();
    return () => {
      isMounted = false;
    };
  }, []);

  // ─────────────────────────────────
  // 2) Fee & Fine Summary for selected range
  // ─────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      setSummaryLoading(true);
      setSummaryError(null);

      let mode = "ytd";
      let params = {};

      if (summaryView === "ytd") {
        mode = "ytd";
        params = { mode };
      } else {
        // last N months
        const months = Number(summaryView || 3) || 3;
        mode = "range";
        params = { mode, months };
      }

      try {
        const resp = await api.get("/fees/dashboard/current-month/", {
          params,
        });
        if (isMounted) setSummaryData(resp.data);
      } catch (err) {
        console.error("Failed to load fee summary", err);
        if (isMounted) {
          setSummaryError(
            err.response?.data?.detail ||
              err.message ||
              "Failed to load fee summary."
          );
        }
      } finally {
        if (isMounted) setSummaryLoading(false);
      }
    }

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, [summaryView]);

  const summaryOptions = useMemo(
    () => [
      { value: "ytd", label: "Year to date (YTD)" },
      { value: "3", label: "Last 3 months" },
      { value: "6", label: "Last 6 months" },
      { value: "12", label: "Last 12 months" },
    ],
    []
  );

  const summarySubtitle = useMemo(() => {
    if (!summaryData) return "";
    if (summaryData.mode === "ytd") {
      return `Year to date – ${summaryData.label}`;
    }
    if (summaryData.mode === "range") {
      return `${summaryData.label} (${summaryData.from} to ${summaryData.to})`;
    }
    return summaryData.label || "";
  }, [summaryData]);

  return (
    <AppShell subtitle="Fee KPIs">
      <div className="page management-page">
        {/* 1) Last 3 months KPIs */}
        <div className="card">
          <div className="card-title">Monthly Fee & Fine KPIs – Last 3 Months</div>
          <div className="card-subtext">
            Breakdown by month – billed, collected, outstanding and fines.
          </div>
        </div>

        {monthlyLoading && (
          <div className="card">
            <p>Loading monthly KPIs…</p>
          </div>
        )}

        {!monthlyLoading && monthlyError && (
          <div className="card">
            <p style={{ color: "#b91c1c" }}>{String(monthlyError)}</p>
          </div>
        )}

        {!monthlyLoading && !monthlyError && monthlyData.length > 0 && (
          <>
            {/* Month-wise KPI cards */}
            <div className="cards-row">
              {monthlyData.map((m) => (
                <div className="card kpi-card" key={`${m.year}-${m.month}`}>
                  <div className="card-title">{m.label}</div>
                  <div className="card-value">{formatCurrency(m.total_billed)}</div>
                  <div className="card-subtext">
                    Collected: {formatCurrency(m.total_collected)} <br />
                    Outstanding: {formatCurrency(m.total_outstanding)}
                  </div>
                </div>
              ))}
            </div>

            {/* Table for last 3 months */}
            <div className="card table-card">
              <div className="card-title">Last 3 Months – Fee & Fine Details</div>
              <div className="table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Total Billed</th>
                      <th>Total Collected</th>
                      <th>Total Outstanding</th>
                      <th>Fine Collected</th>
                      <th>Fine Outstanding</th>
                      <th>Total Fine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m) => (
                      <tr key={`${m.year}-${m.month}-row`}>
                        <td>{m.label}</td>
                        <td>{formatCurrency(m.total_billed)}</td>
                        <td>{formatCurrency(m.total_collected)}</td>
                        <td>{formatCurrency(m.total_outstanding)}</td>
                        <td>{formatCurrency(m.fine_collected)}</td>
                        <td>{formatCurrency(m.fine_outstanding)}</td>
                        <td>{formatCurrency(m.total_fine)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 2) Fee & Fine Summary for selected period */}
        <div className="card">
          <div className="card-title">Fee & Fine Summary</div>
          <div className="card-subtext">
            Aggregate KPIs over a custom range: YTD / last 3 / 6 / 12 months.
          </div>

          <div className="filters-row" style={{ marginTop: 8 }}>
            <div className="filter-group">
              <label className="filter-label">Summary period</label>
              <select
                className="filter-select"
                value={summaryView}
                onChange={(e) => setSummaryView(e.target.value)}
              >
                {summaryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {summarySubtitle && (
            <div
              className="card-subtext"
              style={{ marginTop: 8, fontStyle: "italic" }}
            >
              {summarySubtitle}
            </div>
          )}

          {summaryLoading && (
            <div style={{ marginTop: 12 }}>
              <p>Loading summary…</p>
            </div>
          )}

          {!summaryLoading && summaryError && (
            <div style={{ marginTop: 12 }}>
              <p style={{ color: "#b91c1c" }}>{String(summaryError)}</p>
            </div>
          )}

          {!summaryLoading && !summaryError && summaryData && (
            <div className="table-wrapper" style={{ marginTop: 12 }}>
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Total Billed</th>
                    <th>Total Collected</th>
                    <th>Total Outstanding</th>
                    <th>Fine Collected</th>
                    <th>Fine Outstanding</th>
                    <th>Total Fine</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{summaryData.label}</td>
                    <td>{formatCurrency(summaryData.total_billed)}</td>
                    <td>{formatCurrency(summaryData.total_collected)}</td>
                    <td>{formatCurrency(summaryData.total_outstanding)}</td>
                    <td>{formatCurrency(summaryData.fine_collected)}</td>
                    <td>{formatCurrency(summaryData.fine_outstanding)}</td>
                    <td>{formatCurrency(summaryData.total_fine)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
