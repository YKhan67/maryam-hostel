// src/pages/ScanReceiptPage.js

import React, { useEffect, useState } from "react";
import api from "../api";

function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(v)) return "Rs 0";
  return `Rs ${Number(v).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

let rowKeyCounter = 0;

export default function ScanReceiptPage({ onClose }) {
  const [hostels, setHostels] = useState([]);
  const [hostel, setHostel] = useState("");

  const [files, setFiles] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const [vendorName, setVendorName] = useState("");
  const [vendorId, setVendorId] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNo, setInvoiceNo] = useState("");

  const [availableItems, setAvailableItems] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [rows, setRows] = useState([]);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    api.get("hostels/").then((res) => {
      setHostels(Array.isArray(res.data) ? res.data : res.data.results || []);
    }).catch(() => setHostels([]));
  }, []);

  const handleFilesSelected = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    if (!hostel) {
      alert("Select hostel first");
      setScanError("Select hostel first");
      return;
    }

    setFiles(selected);
    setScanning(true);
    setScanError("");
    setRows([]);

    try {
      const formData = new FormData();
      formData.append("hostel", hostel);
      selected.forEach((f) => formData.append("images", f));

      const res = await api.post("inventory/scan-receipt/", formData);
      const data = res.data;

      setVendorName(data.vendor_name || "");
      setVendorId(data.vendor_id || null);
      setAvailableItems(data.available_items || []);
      setAvailableUnits(data.available_units || []);
      setRows((data.items || []).map((item) => ({
        key: `row-${rowKeyCounter++}`,
        name: item.scanned_name,
        quantity: item.quantity,
        scannedUnit: item.scanned_unit,
        unitId: item.unit_id || "",
        unitName: item.scanned_unit || "",
        itemId: item.item_id || "",
        isNew: item.is_new_item,
        totalPrice: item.total_price,
      })));
    } catch (err) {
      console.error("Scan failed", err);
      setScanError(err.response?.data?.error || err.message || "Scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const updateRow = (key, patch) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const deleteRow = (key) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const handleItemDropdownChange = (key, value) => {
    updateRow(key, { itemId: value, isNew: value === "" });
  };

  const canSave = hostel && rows.length > 0 && rows.every(
    (r) => r.name.trim() && (r.unitId || r.unitName.trim()) && Number(r.quantity) > 0
  );

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const formData = new FormData();
      formData.append("hostel", hostel);
      formData.append("vendor_id", vendorId || "");
      formData.append("vendor_name", vendorName);
      formData.append("date", date);
      formData.append("invoice_no", invoiceNo);
      formData.append("items", JSON.stringify(rows.map((r) => ({
        name: r.name,
        quantity: r.quantity,
        unit_id: r.unitId || null,
        unit_name: r.unitId ? "" : (r.unitName || ""),
        item_id: r.itemId || null,
        total_price: r.totalPrice,
      }))));
      if (files[0]) formData.append("invoice_photo", files[0]);

      const res = await api.post("inventory/scan-receipt/save/", formData);
      setSaveMessage(`✅ Saved ${res.data.created} purchase record(s) for approval.`);
      setRows([]);
      setFiles([]);
    } catch (err) {
      console.error("Save failed", err);
      setSaveMessage(`❌ ${err.response?.data?.error || err.message || "Failed to save."}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page management-page">
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-title">🤖 AI Scan Receipt</div>
        <p className="card-subtext">Upload photo(s) of a purchase receipt - items will be extracted and matched automatically, for you to review before saving.</p>

        <div className="filters-row" style={{ marginTop: 16, display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div className="filter-group">
            <label className="filter-label">Hostel</label>
            <select className="filter-select" value={hostel} onChange={(e) => setHostel(e.target.value)}>
              <option value="">Select Hostel</option>
              {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Receipt Photo(s)</label>
            <label
              className="btn btn-soft"
              style={{ cursor: "pointer", width: "fit-content" }}
              onClick={(e) => {
                if (!hostel) {
                  e.preventDefault();
                  alert("Select hostel first");
                  setScanError("Select hostel first");
                }
              }}
            >
              📷 Select Photo(s)
              <input
                type="file"
                hidden
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                disabled={scanning}
              />
            </label>
          </div>
          {files.length > 0 && <div className="card-subtext" style={{ alignSelf: "center" }}>{files.length} photo(s) selected</div>}
        </div>

        {scanning && <p style={{ marginTop: 16 }}>🔍 Scanning receipt with AI, please wait…</p>}
        {scanError && <p style={{ marginTop: 16, color: "#b91c1c" }}>{scanError}</p>}
      </div>

      {rows.length > 0 && (
        <React.Fragment>
          <div className="card" style={{ marginBottom: "24px" }}>
            <div className="card-title">Receipt Details</div>
            <div className="filters-row" style={{ marginTop: 12, display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div className="filter-group">
                <label className="filter-label">Vendor</label>
                <input type="text" className="filter-input" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="filter-label">Date</label>
                <input type="date" className="filter-input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="filter-label">Invoice No (optional)</label>
                <input type="text" className="filter-input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card table-card">
            <div className="card-title">Scanned Items - Review Before Saving</div>
            <div className="table-wrapper" style={{ overflowX: "auto" }}>
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Matching Item</th>
                    <th>Total Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ minWidth: "160px" }}
                          value={row.name}
                          onChange={(e) => updateRow(row.key, { name: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: "80px" }}
                          value={row.quantity}
                          onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className="form-input"
                          value={row.unitId}
                          onChange={(e) => updateRow(row.key, { unitId: e.target.value })}
                        >
                          <option value="">🆕 New Unit</option>
                          {availableUnits.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>

                        {!row.unitId && (
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Enter unit name"
                            value={row.unitName}
                            onChange={(e) => updateRow(row.key, { unitName: e.target.value })}
                            style={{ marginTop: "4px", width: "100%" }}
                          />
                        )}

                        {row.scannedUnit && row.unitId && (
                          <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                            scanned: {row.scannedUnit}
                          </div>
                        )}

                        {!row.unitId && (
                          <span className="badge badge-warning" style={{ marginTop: "4px", display: "inline-block" }}>
                            NEW UNIT
                          </span>
                        )}
                      </td>
                      <td>
                        <select
                          className="form-input"
                          style={{ minWidth: "160px" }}
                          value={row.itemId}
                          onChange={(e) => handleItemDropdownChange(row.key, e.target.value)}
                        >
                          <option value="">🆕 New Item</option>
                          {availableItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                        {row.isNew && <span className="badge badge-warning" style={{ marginTop: "4px", display: "inline-block" }}>NEW</span>}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: "100px" }}
                          value={row.totalPrice}
                          onChange={(e) => updateRow(row.key, { totalPrice: e.target.value })}
                        />
                      </td>
                      <td>
                        <button onClick={() => deleteRow(row.key)} className="btn btn-soft" style={{ color: "#b91c1c" }} title="Remove this item">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>
                Total: {formatCurrency(rows.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0))}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={handleSave} className="btn btn-primary" disabled={!canSave || saving}>
                  {saving ? "Saving…" : "💾 Save to Inventory"}
                </button>
                <button onClick={() => (onClose ? onClose() : window.close())} className="btn btn-soft">Close</button>
              </div>
            </div>
            {saveMessage && <p style={{ marginTop: "12px" }}>{saveMessage}</p>}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}