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

/* --- SUB-COMPONENT: PURCHASE FORM --- */
const PurchaseEntryForm = ({ hostels, items, vendors, onCancel, onRefresh }) => {
  const [formData, setFormData] = useState({
    hostel: "", item: "", vendor: "", date: new Date().toISOString().split('T')[0],
    quantity: "", price_per_unit: "", invoice_no: ""
  });
  const [invoicePhoto, setInvoicePhoto] = useState(null);
  const [itemsPhoto, setItemsPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (invoicePhoto) data.append("invoice_photo", invoicePhoto);
    if (itemsPhoto) data.append("items_photo", itemsPhoto);

    try {
      await api.post("purchases/", data, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Purchase submitted for approval!");
      onRefresh();
      onCancel();
    } catch (err) {
      alert("Failed to submit purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <select className="form-input" required onChange={e => setFormData({...formData, hostel: e.target.value})}>
        <option value="">Select Hostel</option>
        {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
      </select>
      <select className="form-input" required onChange={e => setFormData({...formData, item: e.target.value})}>
        <option value="">Select Item</option>
        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
      </select>
      <select className="form-input" required onChange={e => setFormData({...formData, vendor: e.target.value})}>
        <option value="">Select Vendor</option>
        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <input type="date" className="form-input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
      <input type="number" placeholder="Quantity" className="form-input" required onChange={e => setFormData({...formData, quantity: e.target.value})} />
      <input type="number" placeholder="Price Per Unit" className="form-input" required onChange={e => setFormData({...formData, price_per_unit: e.target.value})} />
      <div className="filter-group">
        <label className="filter-label">Invoice Photo</label>
        <input type="file" accept="image/*" onChange={e => setInvoicePhoto(e.target.files[0])} />
      </div>
      <div className="filter-group">
        <label className="filter-label">Items Photo</label>
        <input type="file" accept="image/*" onChange={e => setItemsPhoto(e.target.files[0])} />
      </div>
      <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Submitting..." : "Save Purchase"}</button>
        <button type="button" className="btn btn-soft" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

/* --- SUB-COMPONENT: CONSUMPTION FORM --- */
const ConsumptionEntryForm = ({ hostels, items, onCancel, onRefresh }) => {
  const [formData, setFormData] = useState({
    hostel: "", item: "", date: new Date().toISOString().split('T')[0],
    quantity: "", remarks: ""
  });
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (photo) data.append("photo", photo);

    try {
      await api.post("consumptions/", data, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Usage logged successfully!");
      onRefresh();
      onCancel();
    } catch (err) {
      alert("Failed to log usage.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <select className="form-input" required onChange={e => setFormData({...formData, hostel: e.target.value})}>
          <option value="">Select Hostel</option>
          {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select className="form-input" required onChange={e => setFormData({...formData, item: e.target.value})}>
          <option value="">Select Item</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <input type="date" className="form-input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
        <input type="number" placeholder="Quantity Removed" className="form-input" required onChange={e => setFormData({...formData, quantity: e.target.value})} />
      </div>
      <div className="filter-group">
        <label className="filter-label">Proof Photo (Optional)</label>
        <input type="file" accept="image/*" capture="environment" onChange={e => setPhoto(e.target.files[0])} />
      </div>
      <textarea className="form-input" placeholder="Remarks" onChange={e => setFormData({...formData, remarks: e.target.value})} />
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Logging..." : "Confirm Removal"}</button>
        <button type="button" className="btn btn-soft" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

export default function InventoryPage() {
  const [rows, setRows] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [hostelFilter, setHostelFilter] = useState("ALL");
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showConsumptionForm, setShowConsumptionForm] = useState(false);

  const location = useLocation();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invResp, hostelsResp, itemsResp, vendorsResp] = await Promise.all([
        api.get("inventory/list/").catch(() => ({ data: [] })),
        api.get("hostels/").catch(() => ({ data: [] })),
        api.get("items/").catch(() => ({ data: [] })),
        api.get("vendors/").catch(() => ({ data: [] }))
      ]);

      setRows(Array.isArray(invResp.data) ? invResp.data : invResp.data.results || []);
      setHostels(Array.isArray(hostelsResp.data) ? hostelsResp.data : hostelsResp.data.results || []);
      setItems(Array.isArray(itemsResp.data) ? itemsResp.data : itemsResp.data.results || []);
      setVendors(Array.isArray(vendorsResp.data) ? vendorsResp.data : vendorsResp.data.results || []);
    } catch (err) {
      console.error("Failed to load inventory", err);
      setError("Failed to sync records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (location.state?.hostel) setHostelFilter(location.state.hostel);
  }, [location.state]);

  const filteredRows = useMemo(() => {
    let data = rows;
    if (hostelFilter !== "ALL") data = data.filter((r) => String(r.hostel) === String(hostelFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((r) => [r.item, r.vendor, r.invoice_no].some(v => String(v).toLowerCase().includes(q)));
    }
    return data;
  }, [rows, hostelFilter, search]);

  const { totalSpend, lineCount } = useMemo(() => {
    const spend = filteredRows.reduce((sum, r) => sum + Number(r.total_cost || 0), 0);
    return { totalSpend: spend, lineCount: filteredRows.length };
  }, [filteredRows]);

  const handleOCRScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    try {
      setLoading(true);
      const res = await api.post("inventory/ocr/", formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert(`AI Detected Total: Rs ${res.data.detected_total}`);
    } catch (err) {
      alert("AI Scan failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell subtitle="Inventory Logs & Operations">
      <div className="page management-page">

        {/* ACTION HUB */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
           <button onClick={() => setShowPurchaseForm(true)} className="btn btn-primary" style={{ background: '#10b981' }}>➕ Log Purchase</button>
           <button onClick={() => setShowConsumptionForm(true)} className="btn btn-primary" style={{ background: '#c3922b' }}>📤 Log Usage</button>
        </div>

        {showPurchaseForm && (
          <div className="card" style={{ border: '2px solid #10b981', marginBottom: '24px' }}>
            <PurchaseEntryForm hostels={hostels} items={items} vendors={vendors} onCancel={() => setShowPurchaseForm(false)} onRefresh={loadData} />
          </div>
        )}

        {showConsumptionForm && (
          <div className="card" style={{ border: '2px solid #c3922b', marginBottom: '24px' }}>
            <ConsumptionEntryForm hostels={hostels} items={items} onCancel={() => setShowConsumptionForm(false)} onRefresh={loadData} />
          </div>
        )}

        {/* TOP METRICS */}
        <div className="cards-row">
          <div className="card kpi-card">
            <div className="card-title">Total Spend (PKR)</div>
            <div className="card-value">{formatCurrency(totalSpend)}</div>
            <div className="card-subtext">Across {lineCount} records</div>
          </div>
          <div className="card kpi-card">
            <div className="card-title">Active Items</div>
            <div className="card-value">{items.length}</div>
            <div className="card-subtext">Monitored in inventory</div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="card filters-card">
          <div className="filters-row">
            <div className="filter-group">
              <label className="filter-label">Search History</label>
              <input type="text" placeholder="Item, Vendor..." className="filter-input" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="filter-group">
              <label className="filter-label">Filter Branch</label>
              <select className="filter-select" value={hostelFilter} onChange={(e) => setHostelFilter(e.target.value)}>
                <option value="ALL">All Branchs</option>
                {hostels.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
              </select>
            </div>
            <div className="filters-actions">
              <label className="btn btn-soft" style={{ cursor: 'pointer' }}>📷 AI Scan Receipt<input type="file" hidden accept="image/*" onChange={handleOCRScan} /></label>
              <button className="btn btn-soft" onClick={() => exportInventoryToPdf(filteredRows)}>PDF Report</button>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="card table-card">
          <div className="card-title">Approved Purchase History</div>
          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Branch</th>
                  <th>Vendor</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>PO</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => (
                  <tr key={row.id}>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.hostel}</td>
                    <td>{row.vendor}</td>
                    <td>{row.item}</td>
                    <td>{row.quantity} {row.unit}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(row.total_cost)}</td>
                    <td>
                      <span className={`badge ${row.status === 'APPROVED' ? 'badge-success' : row.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                        {row.status || 'PENDING'}
                      </span>
                    </td>
                    <td><button onClick={() => window.open(`${api.defaults.baseURL}inventory/purchases/${row.id}/po/`, "_blank")} className="btn btn-soft" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>📄 PO</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
