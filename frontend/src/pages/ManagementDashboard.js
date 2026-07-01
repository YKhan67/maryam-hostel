// src/pages/ManagementDashboard.js

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import api from "../api";
import "../styles/admin-menu.css";

function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(v)) return "Rs 0";
  const num = Number(v);
  return `Rs ${num.toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
}

// Helper: get Date for first day N months ago (0 = current month)
function getMonthStartOffset(monthOffset = 0) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0–11
  const target = new Date(year, month + monthOffset, 1);
  target.setHours(0, 0, 0, 0);
  return target;
}

export default function ManagementDashboard() {
  const [rows, setRows] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [incomeByHostel, setIncomeByHostel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // 1) Inventory / expenses
        const invResp = await api.get("/inventory/list/", {
          params: { ordering: "-date" },
        });
        let invData = invResp.data;
        if (!Array.isArray(invData) && invData && Array.isArray(invData.results)) {
          invData = invData.results;
        }
        if (!Array.isArray(invData)) {
          throw new Error("Unexpected response format from /inventory/list/");
        }
        if (isMounted) setRows(invData);

        // 2) Hostels master list
        try {
          const hostelsResp = await api.get("/hostels/");
          const hostelsData = Array.isArray(hostelsResp.data)
            ? hostelsResp.data
            : hostelsResp.data?.results || [];
          if (isMounted) setHostels(hostelsData);
        } catch (err) {
          console.warn("Failed to load hostels list", err);
        }

        // 3) Income per hostel (fees)
        try {
          const incomeResp = await api.get("/fees/dashboard/hostel-income/");
          if (isMounted) {
            setIncomeByHostel(
              Array.isArray(incomeResp.data) ? incomeResp.data : []
            );
          }
        } catch (err) {
          console.warn("Failed to load hostel income summary", err);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        if (isMounted) {
          setError(
            err.response?.data?.detail ||
              err.message ||
              "Failed to load management dashboard."
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

  // ─────────────────────────────────
  // Derived metrics
  // ─────────────────────────────────

  const {
    totalSpendCurrentMonth,
    lineCountCurrentMonth,
    spendPerHostel,
    last3MonthsSpendPerHostel,
    topVendors,
  } = useMemo(() => {
    let totalSpendCurrentMonth = 0;
    let lineCountCurrentMonth = 0;

    const spendPerHostel = new Map(); // hostel -> total spend (all-time)
    const last3MonthsSpendPerHostel = new Map(); // hostel -> spend in last 3 months
    const vendorSpend = new Map(); // vendor -> spend (last 3 months)

    const last3Start = getMonthStartOffset(-2); // 1st day of month 2 months ago
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0–11

    for (const r of rows) {
      const spend = Number(r.total_cost || 0) || 0;
      const hostelName = r.hostel || "Unassigned";
      const vendorName = r.vendor || "Unknown";

      // Total spend per hostel (all-time)
      const currentHostelSpend = spendPerHostel.get(hostelName) || 0;
      spendPerHostel.set(hostelName, currentHostelSpend + spend);

      if (r.date) {
        const d = new Date(r.date);
        if (!Number.isNaN(d.getTime())) {
          // Current month metrics
          if (
            d.getFullYear() === currentYear &&
            d.getMonth() === currentMonth
          ) {
            totalSpendCurrentMonth += spend;
            lineCountCurrentMonth += 1;
          }

          // Last 3 months metrics
          if (d >= last3Start) {
            // Expenses per hostel in last 3 months
            const last3HostelSpend =
              last3MonthsSpendPerHostel.get(hostelName) || 0;
            last3MonthsSpendPerHostel.set(hostelName, last3HostelSpend + spend);

            // Vendor spend in last 3 months
            const vendSpend = vendorSpend.get(vendorName) || 0;
            vendorSpend.set(vendorName, vendSpend + spend);
          }
        }
      }
    }

    // Sort vendors
    const topVendors = Array.from(vendorSpend.entries())
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalSpendCurrentMonth,
      lineCountCurrentMonth,
      spendPerHostel,
      last3MonthsSpendPerHostel,
      topVendors,
    };
  }, [rows]);

  // Income map for easier lookup
  const incomeMap = useMemo(() => {
    const map = new Map();
    for (const item of incomeByHostel) {
      map.set(item.hostel, item);
    }
    return map;
  }, [incomeByHostel]);

  // Active & inactive hostels
  const { activeHostelsCount, inactiveHostels, totalIncomeCurrentMonth } =
    useMemo(() => {
      const activeNames = new Set();

      // Active if they have any expense
      for (const hostelName of spendPerHostel.keys()) {
        activeNames.add(hostelName);
      }

      // Also active if they have any income (fee)
      for (const item of incomeByHostel) {
        if (item.hostel) activeNames.add(item.hostel);
      }

      let totalIncomeCurrentMonth = 0;
      for (const item of incomeByHostel) {
        totalIncomeCurrentMonth += Number(item.current_month_income || 0);
      }

      const allHostelNames = (hostels || []).map((h) => h.name);
      const inactiveHostels = allHostelNames.filter(
        (name) => !activeNames.has(name)
      );

      return {
        activeHostelsCount: activeNames.size,
        inactiveHostels,
        totalIncomeCurrentMonth,
      };
    }, [spendPerHostel, incomeByHostel, hostels]);

  const handleHostelClick = (hostelName) => {
    navigate("/inventory", { state: { hostel: hostelName } });
  };

  // Build combined last 3-month stats per hostel (expenses + income)
  const last3MonthsCombined = useMemo(() => {
    const combinedMap = new Map();

    // Expenses side
    for (const [hostel, spend] of last3MonthsSpendPerHostel.entries()) {
      combinedMap.set(hostel, {
        hostel,
        expenses: spend,
        income: 0,
      });
    }

    // Income side (last three months)
    for (const item of incomeByHostel) {
      const hostel = item.hostel || "Unassigned";
      const existing = combinedMap.get(hostel) || {
        hostel,
        expenses: 0,
        income: 0,
      };
      existing.income += Number(item.last_three_month_income || 0);
      combinedMap.set(hostel, existing);
    }

    return Array.from(combinedMap.values()).sort(
      (a, b) => b.expenses - a.expenses
    );
  }, [last3MonthsSpendPerHostel, incomeByHostel]);

  return (
    <AppShell subtitle="Management Dashboard">
      <div className="page management-page">
        {loading && (
          <div className="card">
            <p>Loading management dashboard…</p>
          </div>
        )}

        {!loading && error && (
          <div className="card">
            <p style={{ color: "#b91c1c" }}>{String(error)}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Top KPI cards – expenses + hostels + income */}
            <div className="cards-row">
              <div className="card kpi-card">
                <div className="card-title">
                  Total Spend (All Hostels – Current Month)
                </div>
                <div className="card-value">
                  {formatCurrency(totalSpendCurrentMonth)}
                </div>
                <div className="card-subtext">
                  Across {lineCountCurrentMonth} purchase line
                  {lineCountCurrentMonth === 1 ? "" : "s"} in current month
                </div>
              </div>

              <div className="card kpi-card">
                <div className="card-title">Active Hostels</div>
                <div className="card-value">{activeHostelsCount}</div>
                <div className="card-subtext">
                  Hostels with at least one purchase or fee
                </div>
              </div>

              <div className="card kpi-card">
                <div className="card-title">Inactive Hostels</div>
                <div className="card-value">
                  {inactiveHostels.length || 0}
                </div>
                <div className="card-subtext">
                  No activity (no purchases and no fee income)
                </div>
              </div>

              <div className="card kpi-card">
                <div className="card-title">Total Fee Income (Current Month)</div>
                <div className="card-value">
                  {formatCurrency(totalIncomeCurrentMonth)}
                </div>
                <div className="card-subtext">
                  Fees collected across all hostels (this month)
                </div>
              </div>
            </div>

            {/* Spend & income per hostel – high level */}
            <div className="card table-card">
              <div className="card-title">Spend vs Income by Hostel</div>
              <div className="card-subtext">
                Click a hostel row to open detailed inventory view (all-time).
              </div>
              <div className="table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Hostel</th>
                      <th>Total Spend (All Time)</th>
                      <th>Fee Income (Current Month)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(spendPerHostel.entries()).map(
                      ([hostelName, spend]) => {
                        const incomeItem = incomeMap.get(hostelName);
                        const incomeCurrentMonth = incomeItem
                          ? incomeItem.current_month_income
                          : 0;

                        return (
                          <tr
                            key={hostelName}
                            className="clickable-row"
                            onClick={() => handleHostelClick(hostelName)}
                          >
                            <td>{hostelName}</td>
                            <td>{formatCurrency(spend)}</td>
                            <td>{formatCurrency(incomeCurrentMonth)}</td>
                          </tr>
                        );
                      }
                    )}
                    {spendPerHostel.size === 0 && (
                      <tr>
                        <td colSpan={3}>No purchase data yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Last 3 months – expenses & income per hostel */}
            <div className="card table-card">
              <div className="card-title">
                Last 3 Months – Expenses & Income by Hostel
              </div>
              <div className="table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Hostel</th>
                      <th>Expenses (3 months)</th>
                      <th>Fee Income (3 months)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {last3MonthsCombined.map((row) => (
                      <tr key={row.hostel}>
                        <td>{row.hostel}</td>
                        <td>{formatCurrency(row.expenses)}</td>
                        <td>{formatCurrency(row.income)}</td>
                      </tr>
                    ))}
                    {last3MonthsCombined.length === 0 && (
                      <tr>
                        <td colSpan={3}>No data for last 3 months.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top vendors – last 3 months */}
            <div className="card table-card">
              <div className="card-title">
                Top Purchases by Vendor – Last 3 Months
              </div>
              <div className="table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Total Spend (3 months)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVendors.map((v) => (
                      <tr key={v.vendor}>
                        <td>{v.vendor}</td>
                        <td>{formatCurrency(v.amount)}</td>
                      </tr>
                    ))}
                    {topVendors.length === 0 && (
                      <tr>
                        <td colSpan={2}>No vendor data in last 3 months.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Optional: list inactive hostel names (small text) */}
            {inactiveHostels.length > 0 && (
              <div className="card">
                <div className="card-title">Inactive Hostels</div>
                <div className="card-subtext">
                  {inactiveHostels.join(", ")}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
