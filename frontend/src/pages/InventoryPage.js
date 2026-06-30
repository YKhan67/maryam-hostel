// src/pages/InventoryPage.js

import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AppShell from "../components/AppShell";
import api from "../api";
import {
  exportInventoryToExcel,
  exportInventoryToPdf,
} from "../utils/exportHelpers";

function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(v)) return "Rs 0";
  const num = Number(v);
  return `Rs ${num.toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB");
}

export default function InventoryPage() {
  const [rows, setRows] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [hostelFilter, setHostelFilter] = useState("ALL");

  const location = useLocation();

  // ─────────────────────────────
  // Load purchases + hostels
  // ─────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // 1) Purchases
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

        // 2) Hostels for dropdown (optional)
        try {
          const hostelsResp = await api.get("/hostels/");
          const hostelsData = Array.isArray(hostelsResp.data)
            ? hostelsResp.data
            : hostelsResp.data?.results || [];
          if (isMounted) setHostels(hostelsData);
        } catch (err) {
          console.warn("Failed to load hostels list", err);
        }
      } catch (err) {
        console.error("Failed to load inventory", err);
        if (isMounted) {
          setError(
            err.response?.data?.detail ||
              err.message ||
              "Failed to load inventory data."
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

  // Apply drill-down filter if navigated from Management Dashboard
  useEffect(() => {
    const hostelFromState = location.state?.hostel;
    if (hostelFromState) {
      setHostelFilter(hostelFromState);
    }
  }, [location.state]);

  // ─────────────────────────────
  // Filters applied on the client
  // ─────────────────────────────
  const filteredRows = useMemo(() => {
    let data = rows;

    if (hostelFilter !== "ALL") {
      data = data.filter((r) => String(r.hostel) === String(hostelFilter));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((r) => {
        const fields = [
          r.item,
          r.vendor,
          r.invoice_no,
          r.hostel,
          r.category,
          r.unit,
        ];
        return fields
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
    }

    return data;
  }, [rows, hostelFilter, search]);

  // ─────────────────────────────
  // KPI summaries
  // ─────────────────────────────
  const { totalSpend, lineCount } = useMemo(() => {
    let spend = 0;
    let lines = 0;

    for (const r of filteredRows) {
      const val = Number(r.total_cost || 0);
      if (!Number.isNaN(val)) spend += val;
      lines += 1;
    }

    return { totalSpend: spend, lineCount: lines };
  }, [filteredRows]);

  // ─────────────────────────────
  // Export handlers
  // ─────────────────────────────
  const handleExportExcel = () => {
    const filterDesc = [
      hostelFilter !== "ALL" ? `Hostel: ${hostelFilter}` : null,
      search ? `Search: ${search}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    exportInventoryToExcel(filteredRows, {
      fileName: "maryam_inventory.xlsx",
      filters: filterDesc,
    });
  };

  const handleExportPdf = () => {
    const filterDesc = [
      hostelFilter !== "ALL" ? `Hostel: ${hostelFilter}` : null,
      search ? `Search: ${search}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    exportInventoryToPdf(filteredRows, {
      title: "Maryam Hostel – Inventory Report",
      fileName: "maryam_inventory.pdf",
      filters: filterDesc,
    });
  };

  return (
    <AppShell subtitle="Groceries & Inventory">
      <div className="page management-page">
        {/* Top KPIs */}
        <div className="cards-row">
          <div className="card kpi-card">
            <div className="card-title">Total Spend (PKR)</div>
            <div className="card-value">{formatCurrency(totalSpend)}</div>
            <div className="card-subtext">
              Across {lineCount} purchase line{lineCount === 1 ? "" : "s"}
            </div>
          </div>

          <div className="card kpi-card">
            <div className="card-title">Purchase Lines</div>
            <div className="card-value">{lineCount}</div>
            <div className="card-subtext">
              Filtered result of all grocery purchases
            </div>
          </div>
        </div>

        {/* Filters + Export actions */}
        <div className="card filters-card">
          <div className="filters-row">
            <div className="filter-group">
              <label className="filter-label">Search</label>
              <input
                type="text"
                placeholder="Search item, vendor, invoice"
                className="filter-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Hostel</label>
              <select
                className="filter-select"
                value={hostelFilter}
                onChange={(e) => setHostelFilter(e.target.value)}
              >
                <option value="ALL">All hostels</option>
                {hostels.map((h) => (
                  <option key={h.id ?? h.name} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filters-actions">
              <button
                type="button"
                className="btn btn-soft"
                onClick={handleExportExcel}
              >
                ⬇ Export Excel
              </button>
              <button
                type="button"
                className="btn btn-soft"
                onClick={handleExportPdf}
              >
                ⬇ Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Status panels */}
        {loading && (
          <div className="card">
            <p>Loading inventory data…</p>
          </div>
        )}

        {!loading && error && (
          <div className="card">
            <p style={{ color: "#b91c1c" }}>
              Failed to load inventory data. {String(error)}
            </p>
          </div>
        )}

        {!loading && !error && filteredRows.length === 0 && (
          <div className="card">
            <p>No purchases found for the selected filters.</p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && filteredRows.length > 0 && (
          <div className="card table-card">
            <div className="card-title">Purchase lines</div>
            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hostel</th>
                    <th>Vendor</th>
                    <th>Invoice</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Total cost</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.hostel || "-"}</td>
                      <td>{row.vendor || "-"}</td>
                      <td>{row.invoice_no || "-"}</td>
                      <td>{row.item || "-"}</td>
                      <td>{row.quantity}</td>
                      <td>{formatCurrency(row.price_per_unit)}</td>
                      <td>{formatCurrency(row.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
