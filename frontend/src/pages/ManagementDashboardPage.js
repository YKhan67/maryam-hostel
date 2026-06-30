// src/pages/ManagementDashboardPage.js
import React, { useEffect, useState } from "react";
import api from "../api";

function StatCard({ title, children }) {
  return (
    <div className="bg-white shadow-md rounded-xl p-5 mb-4">
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function ManagementDashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchKpis() {
      setLoading(true);
      setError(null);

      try {
        // use axios instance so JWT is attached automatically
        const response = await api.get("/management/kpis/");
        if (!cancelled) {
          setKpis(response.data);
        }
      } catch (err) {
        console.error("Failed to load management KPIs", err);
        if (!cancelled) {
          setError("Failed to load management KPIs. Please check the backend logs.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchKpis();
    return () => {
      cancelled = true;
    };
  }, []);

  // Simple render helpers so UI doesn’t crash if some fields are missing
  const occupancy = kpis?.occupancy || {};
  const rent = kpis?.rent || {};
  const overdue = kpis?.overdue || {};
  const inventory = kpis?.inventory || {};
  const topVendors = inventory.top_vendors || [];
  const topItems = inventory.top_items || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Management Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Snapshot of occupancy, rent performance, and inventory spend.
        </p>
      </div>

      {/* Error / loading states */}
      {loading && (
        <div className="text-sm text-gray-500">Loading management KPIs…</div>
      )}
      {error && (
        <div className="text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* Overall status cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Occupancy">
          <div className="text-2xl font-bold">
            {occupancy.percent ?? 0}%
          </div>
          <div className="text-xs text-gray-500">
            {occupancy.filled_beds ?? 0} / {occupancy.total_beds ?? 0} beds filled
          </div>
        </StatCard>

        <StatCard title="Active students">
          <div className="text-2xl font-bold">
            {kpis?.active_students ?? 0}
          </div>
          <div className="text-xs text-gray-500">
            Across all Maryam hostels
          </div>
        </StatCard>

        <StatCard title="Current month rent">
          <div className="text-xs text-gray-600 mb-1">
            Invoiced:{" "}
            <span className="font-semibold text-emerald-700">
              Rs {rent.invoiced ?? 0}
            </span>
          </div>
          <div className="text-xs text-gray-600 mb-1">
            Collected:{" "}
            <span className="font-semibold text-emerald-700">
              Rs {rent.collected ?? 0}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            Outstanding:{" "}
            <span className="font-semibold text-red-600">
              Rs {rent.outstanding ?? 0}
            </span>
          </div>
        </StatCard>

        <StatCard title="Overdue">
          <div className="text-2xl font-bold">
            {overdue.students ?? 0} students
          </div>
          <div className="text-xs text-gray-500">
            {overdue.unpaid_invoices ?? 0} unpaid invoices from past months
          </div>
        </StatCard>
      </div>

      {/* Monthly groceries & inventory */}
      <div className="bg-white shadow-md rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Monthly groceries &amp; inventory
            </h2>
            <p className="text-xs text-gray-500">
              Spend and price benefit analysis for current month.
            </p>
          </div>
          <div className="text-right mt-3 md:mt-0">
            <div className="text-xs text-gray-500">Total spend this month</div>
            <div className="text-xl font-bold text-emerald-700">
              Rs {inventory.total_spend ?? 0}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Top vendors */}
          <div>
            <h3 className="font-semibold mb-2 text-gray-800">
              Top vendors by spend
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left border">Vendor</th>
                    <th className="px-3 py-2 text-right border">Total spent</th>
                    <th className="px-3 py-2 text-right border">
                      Avg. unit price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topVendors.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-2 text-center text-gray-400"
                      >
                        No vendor data.
                      </td>
                    </tr>
                  )}
                  {topVendors.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{row.vendor_name}</td>
                      <td className="px-3 py-2 text-right">
                        Rs {row.total_spent}
                      </td>
                      <td className="px-3 py-2 text-right">
                        Rs {row.avg_unit_price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top items */}
          <div>
            <h3 className="font-semibold mb-2 text-gray-800">
              Top items by spend
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left border">Item</th>
                    <th className="px-3 py-2 text-right border">Total spent</th>
                    <th className="px-3 py-2 text-right border">
                      Avg. unit price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-2 text-center text-gray-400"
                      >
                        No item data.
                      </td>
                    </tr>
                  )}
                  {topItems.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{row.item_name}</td>
                      <td className="px-3 py-2 text-right">
                        Rs {row.total_spent}
                      </td>
                      <td className="px-3 py-2 text-right">
                        Rs {row.avg_unit_price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
