// src/pages/InventoryItemsPage.js
import React, { useEffect, useState } from "react";
import api from "../api";

export default function InventoryItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await api.get("items/");
      setItems(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) { console.error("Failed to load items", err); }
    finally { setLoading(false); }
  }

  const downloadQR = async (itemId) => {
    try {
      const response = await api.get(`items/${itemId}/qr_code/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `QR_Item_${itemId}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { alert("Failed to download secure QR code."); }
  };

  const printAllLabels = async () => {
    try {
      const response = await api.get("inventory/print_all_labels/", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Inventory_QR_Labels.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { alert("Failed to generate PDF."); }
  };

  if (loading) return <p>Loading Items...</p>;

  return (
    <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div><h2 style={{ margin: 0 }}>Item Management</h2><p className="card-subtext">Print QR codes for instant logging.</p></div>
          <button onClick={printAllLabels} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>🖨️ Print All Labels (PDF)</button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Code</th><th>Item Name</th><th>Category</th><th>Unit</th><th style={{ textAlign: 'right' }}>QR Action</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td><code>{item.code}</code></td>
                  <td style={{ fontWeight: 700 }}>{item.name}</td>
                  <td>{item.category_name}</td>
                  <td>{item.unit_name}</td>
                  <td style={{ textAlign: 'right' }}><button onClick={() => downloadQR(item.id)} className="btn btn-soft" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>🖨️ Get Label</button></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No inventory items found.</td></tr>}
            </tbody>
          </table>
        </div>
    </div>
  );
}
