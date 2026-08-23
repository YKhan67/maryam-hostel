// src/pages/AssetInventoryPage.js
import React, { useEffect, useState } from "react";
import api from "../api";
import { usePermissions } from "../hooks/usePermissions";
import { formatPKR } from "../utils/formatPKR";

export default function AssetInventoryPage() {
  const { check } = usePermissions();
  const isReadOnly = !check("ASSETS", "edit");

  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [assetRes, catRes, hostelRes] = await Promise.all([
        api.get("finance/assets/"),
        api.get("finance/asset-categories/"),
        api.get("hostels/")
      ]);
      setAssets(assetRes.data.results || assetRes.data);
      setCategories(catRes.data.results || catRes.data);
      setHostels(hostelRes.data.results || hostelRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleMarkSold = async (asset) => {
    const priceStr = prompt(`Enter total sale price for ${asset.name} (Qty: ${asset.quantity}):`, asset.current_value);
    if (priceStr === null) return;
    const price = parseFloat(priceStr);
    if (isNaN(price)) return alert("Invalid price entered.");

    try {
        await api.patch(`finance/assets/${asset.id}/`, {
            status: 'SOLD',
            sale_price: price,
            sold_date: new Date().toISOString().split('T')[0]
        });
        alert("Asset marked as SOLD.");
        loadData();
    } catch (err) {
        alert("Failed to update status.");
    }
  };

  if (loading) return <p>Loading Assets...</p>;

  return (
    <div className="page management-page">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Asset Registry</h2>
            <p className="card-subtext">Comprehensive log of furniture, machinery, and equipment.</p>
          </div>
          {!isReadOnly && <button onClick={() => { setEditingAsset(null); setShowModal(true); }} className="btn btn-primary">➕ Register Asset</button>}
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Asset Details</th>
                <th>Branch</th>
                <th>Qty</th>
                <th>Purchased On</th>
                <th>Purchase Cost</th>
                <th>Status</th>
                <th>Current Value</th>
                {!isReadOnly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id} style={asset.status === 'SOLD' ? { opacity: 0.6, background: '#f8fafc' } : {}}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{asset.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--brand-grey)' }}>
                        CAT: {asset.category_name} | SN: {asset.serial_number || 'N/A'}
                    </div>
                  </td>
                  <td>{asset.hostel_name}</td>
                  <td style={{ fontWeight: 600 }}>{asset.quantity}</td>
                  <td>{new Date(asset.purchase_date).toLocaleDateString('en-GB')}</td>
                  <td>
                    {formatPKR(asset.purchase_price)}
                    {asset.quantity > 1 && <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{formatPKR(asset.purchase_price / asset.quantity)} / unit</div>}
                  </td>
                  <td>
                    <span className={`badge ${asset.status === 'ACTIVE' ? 'badge-success' : asset.status === 'SOLD' ? 'badge-soft' : 'badge-warning'}`}>
                      {asset.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--success)', fontWeight: 800 }}>
                    {asset.status === 'SOLD' ? `Recov: ${formatPKR(asset.sale_price)}` : formatPKR(asset.current_value)}
                  </td>
                  {!isReadOnly && (
                    <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setEditingAsset(asset); setShowModal(true); }} className="btn btn-soft" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>Edit</button>
                            {asset.status !== 'SOLD' && (
                                <button onClick={() => handleMarkSold(asset)} className="btn" style={{ padding: '4px 10px', fontSize: '0.7rem', background: '#fee2e2', color: '#b91c1c', border: 'none' }}>Sold</button>
                            )}
                        </div>
                    </td>
                  )}
                </tr>
              ))}
              {assets.length === 0 && (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>No assets registered.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '95%', maxWidth: '650px', maxHeight: '95vh', overflowY: 'auto' }}>
             <h2 style={{ marginBottom: '20px' }}>{editingAsset ? 'Modify Asset' : 'Register New Asset'}</h2>
             <AssetForm
               categories={categories}
               hostels={hostels}
               asset={editingAsset}
               onSave={() => { setShowModal(false); loadData(); }}
               onCancel={() => setShowModal(false)}
             />
          </div>
        </div>
      )}
    </div>
  );
}

function AssetForm({ categories, hostels, asset, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: asset?.name || "",
    category: asset?.category || "",
    hostel: asset?.hostel || "",
    serial_number: asset?.serial_number || "",
    quantity: asset?.quantity || 1,
    purchase_date: asset?.purchase_date || new Date().toISOString().split('T')[0],
    purchase_price: asset?.purchase_price || "",
    current_value: asset?.current_value || "",
    status: asset?.status || "ACTIVE",
    remarks: asset?.remarks || ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(formData.quantity) <= 0) return alert("Quantity must be at least 1.");
    try {
      if (asset) await api.patch(`finance/assets/${asset.id}/`, formData);
      else await api.post("finance/assets/", formData);
      onSave();
    } catch (err) {
      alert("Failed to save record.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="form-group">
            <label className="form-label">Asset Name (e.g. UPS 5KVA)</label>
            <input className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option value="">Select...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>
        <div className="form-group">
            <label className="form-label">Location (Branch)</label>
            <select className="form-input" required value={formData.hostel} onChange={e => setFormData({...formData, hostel: e.target.value})}>
              <option value="">Select...</option>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
        </div>
        <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="ACTIVE">Active</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SOLD">Sold</option>
                <option value="SCRAPPED">Scrapped</option>
            </select>
        </div>
        <div className="form-group">
            <label className="form-label">Quantity</label>
            <input className="form-input" type="number" min="1" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
        </div>
        <div className="form-group">
            <label className="form-label">Serial Number</label>
            <input className="form-input" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} />
        </div>
        <div className="form-group">
            <label className="form-label">Purchase Date</label>
            <input className="form-input" type="date" required value={formData.purchase_date} onChange={e => setFormData({...formData, purchase_date: e.target.value})} />
        </div>
        <div className="form-group">
            <label className="form-label">Total Purchase Price (All Units)</label>
            <input className="form-input" type="number" step="0.01" required value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value, current_value: e.target.value})} />
        </div>
      </div>
      <div className="form-group">
          <label className="form-label">Additional Remarks / History</label>
          <textarea className="form-input" rows="2" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
      </div>
      <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
        <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>{asset ? 'Apply Changes' : 'Register Asset'}</button>
        <button type="button" onClick={onCancel} className="btn btn-soft" style={{ flex: 1 }}>Cancel</button>
      </div>
    </form>
  );
}
