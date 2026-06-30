// src/pages/InventoryKpiPage.js

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

function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`; // e.g. 2025-11
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export default function InventoryKpiPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all inventory similar to InventoryPage
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const resp = await api.get("/inventory/list/", {
          params: { ordering: "-date" },
        });

        let data = resp.data;
        if (!Array.isArray(data) && data && Array.isArray(data.results)) {
          data = data.results;
        }
        if (!Array.isArray(data)) {
          throw new Error("Unexpected response format from /inventory/list/");
        }
        if (isMounted) setRows(data);
      } catch (err) {
        console.error("Failed to load inventory KPI data", err);
        if (isMounted) {
          setError(
            err.response?.data?.detail ||
              err.message ||
              "Failed to load inventory KPI data."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Aggregate by month
  const monthly = useMemo(() => {
    const map = new Map(); // key: YYYY-MM -> { totalSpend, lines }
    const perHostel = new Map(); // hostel name -> totalSpend

    for (const r of rows) {
      if (!r.date) continue;
      const key = getMonthKey(r.date);
      if (!key) continue;

      const spend = Number(r.total_cost || 0) || 0;

      const current = map.get(key) || { totalSpend: 0, lines: 0 };
      current.totalSpend += spend;
      current.lines += 1;
      map.set(key, current);

      if (r.hostel) {
        const hSpend = perHostel.get(r.hostel) || 0;
        perHostel.set(r.hostel, hSpend + spend);
      }
    }

    const months = Array.from(map.entries()).sort((a, b) =>
      a[0] < b[0] ? 1 : -1
    ); // latest first

    const topHostel =
      Array.from(perHostel.entries()).sort((a, b) => b[1] - a[1])[0] || null;

    return { months, topHostel };
  }, [rows]);

  const { months, topHostel } = monthly;

  const thisMonthKey = months[0]?.[0];
  const lastMonthKey = months[1]?.[0];

  const thisMonthSpend = months[0]?.[1]?.totalSpend || 0;
  const lastMonthSpend = months[1]?.[1]?.totalSpend || 0;

  let changePct = null;
  if (lastMonthSpend > 0) {
    changePct = ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100;
  }

  return (
    <AppShell subtitle="Inventory KPIs & Trends">
      <div className="page management-page">
        <div className="cards-row">
          <div className="card kpi-card">
            <div className="card-title">
              This Month Spend{" "}
              {thisMonthKey && (
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  ({monthLabel(thisMonthKey)})
                </span>
              )}
            </div>
            <div className="card-value">{formatCurrency(thisMonthSpend)}</div>
            <div className="card-subtext">
              Based on {months[0]?.[1]?.lines || 0} purchase lines
            </div>
          </div>

          <div className="card kpi-card">
            <div className="card-title">
              Last Month Spend{" "}
              {lastMonthKey && (
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  ({monthLabel(lastMonthKey)})
                </span>
              )}
            </div>
            <div className="card-value">{formatCurrency(lastMonthSpend)}</div>
            <div className="card-subtext">
              For comparison against current month
            </div>
          </div>

          <div className="card kpi-card">
            <div className="card-title">Month-on-Month Change</div>
            <div className="card-value">
              {changePct === null ? (
                "N/A"
              ) : (
                <>
                  {changePct >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(changePct).toFixed(1)}%
                </>
              )}
            </div>
            <div className="card-subtext">
              {changePct === null
                ? "Need at least 2 months of data"
                : changePct >= 0
                ? "Spend increased vs last month"
                : "Spend decreased vs last month"}
            </div>
          </div>

          <div className="card kpi-card">
            <div className="card-title">Top Spending Hostel (All Time)</div>
            <div className="card-value">
              {topHostel ? topHostel[0] : "N/A"}
            </div>
            <div className="card-subtext">
              {topHostel
                ? `Total spend ${formatCurrency(topHostel[1])}`
                : "No hostel spend data yet"}
            </div>
          </div>
        </div>

        <div className="card table-card">
          <div className="card-title">Monthly Spend – Last 6 Months</div>
          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Total Spend</th>
                  <th>Purchase Lines</th>
                </tr>
              </thead>
              <tbody>
                {months.slice(0, 6).map(([key, val]) => (
                  <tr key={key}>
                    <td>{monthLabel(key)}</td>
                    <td>{formatCurrency(val.totalSpend)}</td>
                    <td>{val.lines}</td>
                  </tr>
                ))}
                {months.length === 0 && (
                  <tr>
                    <td colSpan={3}>No inventory data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {loading && (
          <div className="card">
            <p>Loading KPI data…</p>
          </div>
        )}
        {!loading && error && (
          <div className="card">
            <p style={{ color: "#b91c1c" }}>{String(error)}</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
