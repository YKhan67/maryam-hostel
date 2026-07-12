// src/pages/UserManagementPage.js
import React, { useEffect, useState, useMemo } from "react";
import api from "../api";

const ROLE_OPTIONS = ["STUDENT", "HOSTEL_MANAGER", "CITY_MANAGER", "STAFF", "SUPER_ADMIN", "PARTNER"];

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [uRes, hRes] = await Promise.all([api.get("users/"), api.get("hostels/")]);
      setUsers(uRes.data.results || uRes.data);
      setHostels(hRes.data.results || hRes.data);
    } catch (err) { console.error("Sync failed:", err); }
    finally { setLoading(false); }
  }

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase();
      const matchesSearch = !search || [u.username, u.first_name, u.last_name].some(v => v?.toLowerCase().includes(q));
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchesBranch = branchFilter === "ALL" || String(u.hostel) === String(branchFilter);
      return matchesSearch && matchesRole && matchesBranch;
    });
  }, [users, search, roleFilter, branchFilter]);

  async function handleToggleStatus(user) {
    try {
      await api.post(`users/${user.id}/toggle_status/`);
      loadData();
    } catch (err) { alert(`Action failed: ${err.response?.status}`); }
  }

  async function handleResetPassword(user) {
    const p = prompt(`New temporary password for ${user.username}:`);
    if (!p) return;
    try {
      await api.post(`users/${user.id}/reset_password/`, { new_password: p });
      alert("Password updated successfully!");
    } catch (err) { alert("Failed to reset password."); }
  }

  if (loading) return <p>Syncing...</p>;

  return (
    <div className="page management-page">
        <div className="cards-row" style={{ marginBottom: '24px' }}>
          <div className="card kpi-card"><div className="card-title">All Accounts</div><div className="card-value">{users.length}</div><div className="card-subtext">Registered identities</div></div>
          <div className="card kpi-card"><div className="card-title">Students</div><div className="card-value">{users.filter(u => u.role === 'STUDENT').length}</div><div className="card-subtext">Active residents</div></div>
          <div className="card kpi-card"><div className="card-title">Status: Active</div><div className="card-value">{users.filter(u => u.is_active).length}</div><div className="card-subtext">Enabled accounts</div></div>
        </div>

        <div className="card filters-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
              <input className="filter-input" style={{ flex: 1 }} placeholder="Search name or user..." value={search} onChange={e => setSearch(e.target.value)} />
              <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}><option value="ALL">All Roles</option>{ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}</select>
              <select className="filter-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}><option value="ALL">All Branches</option>{hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">➕ Create New User</button>
          </div>
        </div>

        <div className="card table-card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Account</th><th>Contact Details</th><th>Primary Branch</th><th>Security Status</th><th style={{ textAlign: 'right', paddingRight: '24px' }}>Control Panel</th></tr></thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td><b>{u.username}</b><br/><span className="badge badge-soft">{u.role}</span></td>
                    <td>{u.first_name} {u.last_name}<br/><small>{u.email || "No email"}</small></td>
                    <td>{u.hostel_name || 'Global Access'}</td>
                    <td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'ACTIVE' : 'DISABLED'}</span></td>
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}><div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}><button onClick={() => { setEditingUser(u); setShowEditModal(true); }} className="btn btn-soft" style={{ fontSize: '0.75rem' }}>Edit</button><button onClick={() => handleToggleStatus(u)} className="btn btn-soft" style={{ fontSize: '0.75rem' }}>Toggle</button><button onClick={() => handleResetPassword(u)} className="btn btn-soft" style={{ fontSize: '0.75rem' }}>Pass</button>{u.role === "STUDENT" && u.parent_link_token && (<button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/parent-portal/${u.parent_link_token}`); alert("Link Copied!"); }} className="btn btn-soft" style={{ fontSize: '0.75rem' }}>🔗 Link</button>)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {(showEditModal || showAddModal) && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '95%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ marginBottom: '24px' }}>{showAddModal ? "New User Registration" : `Modify Profile: ${editingUser.username}`}</h2>
              <UserEditForm user={showAddModal ? null : editingUser} hostels={hostels} onSave={() => { setShowEditModal(false); setShowAddModal(false); loadData(); }} onCancel={() => { setShowEditModal(false); setShowAddModal(false); }} />
            </div>
          </div>
        )}
    </div>
  );
}

function UserEditForm({ user, hostels, onSave, onCancel }) {
  const [form, setForm] = useState({
    username: user?.username || "", first_name: user?.first_name || "", last_name: user?.last_name || "", email: user?.email || "", role: user?.role || "STUDENT", hostel: user?.hostel || "", is_active: user ? user.is_active : true, password: "",
    profile: { mobile: user?.profile?.mobile || "", whatsapp: user?.profile?.whatsapp || "", parent_whatsapp: user?.profile?.parent_whatsapp || "", college_name: user?.profile?.college_name || "" }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form }; if (payload.hostel === "") payload.hostel = null; if (!payload.password) delete payload.password;
      if (user) { await api.patch(`users/${user.id}/`, payload); alert("Profile updated!"); }
      else { await api.post("users/", payload); alert("User created!"); }
      onSave();
    } catch (err) { const msg = err.response?.data ? JSON.stringify(err.response.data) : "Save failed."; alert(`Action failed: ${msg}`); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="form-group"><label className="form-label">Username</label><input className="form-input" placeholder="Auto-generate if blank" value={form.username} onChange={e => setForm({...form, username: e.target.value})} /></div>
        {!user && <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>}
        <div className="form-group"><label className="form-label">First Name</label><input className="form-input" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
        <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
        <div className="form-group"><label className="form-label">Role</label><select className="form-input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>{ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Branch</label><select className="form-input" value={form.hostel} onChange={e => setForm({...form, hostel: e.target.value})}><option value="">Global / Unassigned</option>{hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
      </div>
      {form.role === 'STUDENT' && (
        <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 16px 0' }}>Student Profile</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <input className="form-input" placeholder="Mobile" value={form.profile.mobile} onChange={e => setForm({...form, profile: {...form.profile, mobile: e.target.value}})} />
            <input className="form-input" placeholder="WhatsApp" value={form.profile.whatsapp} onChange={e => setForm({...form, profile: {...form.profile, whatsapp: e.target.value}})} />
            <input className="form-input" placeholder="Guardian WhatsApp" value={form.profile.parent_whatsapp} onChange={e => setForm({...form, profile: {...form.profile, parent_whatsapp: e.target.value}})} />
            <input className="form-input" placeholder="College" value={form.profile.college_name} onChange={e => setForm({...form, profile: {...form.profile, college_name: e.target.value}})} />
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px' }}><button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{user ? "Save" : "Create"}</button><button type="button" onClick={onCancel} className="btn btn-soft" style={{ flex: 1 }}>Cancel</button></div>
    </form>
  );
}
