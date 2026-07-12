import React, { useEffect, useState } from "react";
import api from "../api";

export default function InventoryKpiCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/inventory/summary/")
      .then((res) => setData(res.data))
      .catch((err) => console.error("KPI error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading KPI data...</p>;
  if (!data) return <p>No KPI data found.</p>;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <div className="card kpi">
        <h3>Total Spent</h3>
        <p>PKR {data.total_spent.toLocaleString()}</p>
      </div>

      <div className="card kpi">
        <h3>Top Vendor</h3>
        <p>{data.by_vendor?.[0]?.vendor || "N/A"}</p>
      </div>

      <div className="card kpi">
        <h3>Top Item</h3>
        <p>{data.by_item?.[0]?.item || "N/A"}</p>
      </div>
    </div>
  );
}
