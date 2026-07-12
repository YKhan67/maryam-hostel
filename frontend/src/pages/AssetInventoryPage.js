// src/pages/AssetInventoryPage.js
import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { formatPKR } from "../utils/formatPKR";

export default function AssetInventoryPage() {
  const { user } = useContext(AuthContext);
  const { check } = usePermissions();
  const isReadOnly = !check("ASSETS", "add") && !check("ASSETS", "edit");

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

  if (loading) return <p>Loading Assets...</p>;

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Asset Registry</h2>
            <p className="card-subtext">Machinery, Furniture, and high-value equipment.</p>
          </div>
          {!isReadOnly && <button onClick={() => { setEditingAsset(null); setShowModal(true); }} className="btn btn-primary">➕ Register Asset</button>}
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Branch</th>
                <th>Purchase Price</th>
                <th>Current Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id}>
                  <td><b>{asset.name}</b><br/><small>SN: {asset.serial_number || 'N/A'}</small></td>
                  <td>{asset.category_name}</td>
                  <td>{asset.hostel_name}</td>
                  <td>{formatPKR(asset.purchase_price)}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 700 }}>{formatPKR(asset.current_value)}</td>
                  <td>
                    <span className={`badge ${asset.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No fixed assets registered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
             <h2>{editingAsset ? 'Edit Asset' : 'Register New Asset'}</h2>
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
    </>
  );
}

function AssetForm({ categories, hostels, asset, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: asset?.name || "",
    category: asset?.category || "",
    hostel: asset?.hostel || "",
    serial_number: asset?.serial_number || "",
    purchase_date: asset?.purchase_date || new Date().toISOString().split('T')[0],
    purchase_price: asset?.purchase_price || "",
    current_value: asset?.current_value || "",
    status: asset?.status || "ACTIVE"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (asset) await api.patch(`finance/assets/${asset.id}/`, formData);
      else await api.post("finance/assets/", formData);
      onSave();
    } catch (err) {
      alert("Failed to save asset details.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <input className="form-input" placeholder="Asset Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <select className="form-input" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
          <option value="">Select Category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-input" required value={formData.hostel} onChange={e => setFormData({...formData, hostel: e.target.value})}>
          <option value="">Select Branch</option>
          {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <input className="form-input" placeholder="Serial Number" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} />
        <input className="form-input" type="date" required value={formData.purchase_date} onChange={e => setFormData({...formData, purchase_date: e.target.value})} />
        <input className="form-input" type="number" placeholder="Purchase Price" required value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value, current_value: e.target.value})} />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Asset</button>
        <button type="button" onClick={onCancel} className="btn btn-soft" style={{ flex: 1 }}>Cancel</button>
      </div>
    </form>
  );
}
