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

  // FIXED: Reset password with better error handling
  async function handleResetPassword(user) {
    const p = prompt(`New temporary password for ${user.username}:`);
    if (p === null) return;
    
    if (!p || p.trim() === "") {
      alert("Password cannot be empty.");
      return;
    }
    
    if (p.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }
    
    try {
      await api.post(`users/${user.id}/reset_password/`, { new_password: p });
      alert(`✅ Password updated successfully for ${user.username}!`);
    } catch (err) {
      console.error("Reset password error:", err);
      let errorMsg = "Failed to reset password.";
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.response?.status === 403) {
        errorMsg = "❌ You don't have permission to reset this user's password.";
      } else if (err.response?.status === 404) {
        errorMsg = "❌ User not found.";
      } else if (err.response?.status === 400) {
        errorMsg = "❌ Invalid request. Please try again.";
      }
      alert(errorMsg);
    }
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
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditingUser(u); setShowEditModal(true); }} className="btn btn-soft" style={{ fontSize: '0.75rem' }}>Edit</button>
                        <button onClick={() => handleToggleStatus(u)} className="btn btn-soft" style={{ fontSize: '0.75rem' }}>Toggle</button>
                        <button onClick={() => handleResetPassword(u)} className="btn btn-soft" style={{ fontSize: '0.75rem' }}>Pass</button>
                        {u.role === "STUDENT" && u.parent_link_token && (
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/parent-portal/${u.parent_link_token}`); alert("Link Copied!"); }} className="btn btn-soft" style={{ fontSize: '0.75rem' }}>🔗 Link</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {(showEditModal || showAddModal) && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ marginBottom: '24px' }}>{showAddModal ? "New User Registration" : `Modify Profile: ${editingUser.username}`}</h2>
              <UserEditForm user={showAddModal ? null : editingUser} hostels={hostels} onSave={() => { setShowEditModal(false); setShowAddModal(false); loadData(); }} onCancel={() => { setShowEditModal(false); setShowAddModal(false); }} />
            </div>
          </div>
        )}
    </div>
  );
}

function UtilityChargesUI({ utilities = [], onChange }) {
  const [rows, setRows] = useState(utilities.map((u, idx) => ({ 
    id: u.id,
    _key: u.id || `new_${idx}`, 
    name: u.name, 
    amount: u.amount, 
    is_active: u.is_active 
  })) || []);

  useEffect(() => {
    onChange(rows.filter(r => r.name || r.amount));
  }, [rows, onChange]);

  const addUtility = () => {
    setRows([...rows, { _key: `new_${Date.now()}`, name: "", amount: "0.00", is_active: true }]);
  };

  const removeUtility = (key) => {
    setRows(rows.filter(r => r._key !== key));
  };

  const updateUtility = (key, field, value) => {
    setRows(rows.map(r => r._key === key ? { ...r, [field]: value } : r));
  };

  return (
    <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      <h4 style={{ margin: '0 0 16px 0' }}>Utility Charges</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {rows.map((row) => (
          <div key={row._key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', alignItems: 'center' }}>
            <input className="form-input" placeholder="Utility (e.g., Heater, AC, Water)" value={row.name} onChange={(e) => updateUtility(row._key, 'name', e.target.value)} />
            <input className="form-input" type="number" placeholder="Amount" step="0.01" value={row.amount} onChange={(e) => updateUtility(row._key, 'amount', e.target.value)} />
            <button type="button" onClick={() => removeUtility(row._key)} className="btn btn-soft" style={{ padding: '8px 12px', fontSize: '0.75rem', background: '#fee2e2', color: '#dc2626' }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addUtility} className="btn btn-soft" style={{ marginTop: '8px', fontWeight: 600 }}>+ Add Utility</button>
      </div>
    </div>
  );
}

function UserEditForm({ user, hostels, onSave, onCancel }) {
  // Initialize form with proper data for both student and non-student
  const getInitialProfile = () => {
    const profile = user?.profile || {};
    return {
      nic_number: profile.nic_number || "",
      mobile: profile.mobile || "",
      whatsapp: profile.whatsapp || "",
      joined_on: profile.joined_on || "",
      guardian_name: profile.guardian_name || "",
      guardian_phone: profile.guardian_phone || "",
      guardian_nic_number: profile.guardian_nic_number || "",
      parent_name: profile.parent_name || "",
      parent_phone: profile.parent_phone || "",
      parent_whatsapp: profile.parent_whatsapp || "",
      parent_nic_number: profile.parent_nic_number || "",
      college_name: profile.college_name || "",
      monthly_rent: profile.monthly_rent ?? "",
      course: profile.course || "",
      year: profile.year || "",
      left_on: profile.left_on || "",
      security_deposit: profile.security_deposit ?? "",
      utilities: profile.utilities || [],
      // Employee fields
      designation: profile.designation || "",
      pay_type: profile.pay_type || "MONTHLY",
      base_salary: profile.base_salary ?? "",
      housing_allowance: profile.housing_allowance ?? "",
      fuel_allowance: profile.fuel_allowance ?? "",
      rate_per_task: profile.rate_per_task ?? "",
      bank_name: profile.bank_name || "",
      iban: profile.iban || "",
    };
  };

  const [form, setForm] = useState({
    username: user?.username || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
    role: user?.role || "STUDENT",
    hostel: user?.hostel || "",
    is_active: user ? user.is_active : true,
    password: "",
    profile: getInitialProfile()
  });

  const [imagePreviews, setImagePreviews] = useState({
    nic_front_picture: user?.profile?.nic_front_picture || null,
    nic_back_picture: user?.profile?.nic_back_picture || null,
    profile_picture: user?.profile?.profile_picture || null
  });

  const [imageFiles, setImageFiles] = useState({
    nic_front_picture: null,
    nic_back_picture: null,
    profile_picture: null
  });

  const [utilities, setUtilities] = useState(user?.profile?.utilities || []);

  const handleImageChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      setImageFiles({ ...imageFiles, [field]: file });
      const previewUrl = URL.createObjectURL(file);
      setImagePreviews({ ...imagePreviews, [field]: previewUrl });
    }
  };

  // FIXED: Get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || 
        imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
      return imagePath;
    }
    
    let baseURL = api.defaults.baseURL || '';
    baseURL = baseURL.replace(/\/api\/?$/, '');
    const path = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
    return `${baseURL}${path}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataObj = new FormData();

      const appendValue = (key, value) => {
        if (value === null || value === undefined || value === "") {
          formDataObj.append(key, "");
        } else if (typeof value === "boolean") {
          formDataObj.append(key, value ? "true" : "false");
        } else if (typeof value === "number") {
          formDataObj.append(key, String(value));
        } else {
          formDataObj.append(key, String(value));
        }
      };

      appendValue("username", form.username);
      appendValue("first_name", form.first_name);
      appendValue("last_name", form.last_name);
      appendValue("email", form.email);
      appendValue("role", form.role);
      appendValue("is_active", form.is_active);
      
      if (form.hostel && form.hostel !== "") {
        appendValue("hostel", form.hostel);
      }

      if (form.password && form.password !== "") {
        appendValue("password", form.password);
      }

      const rawProfile = form.profile;
      let profileData = {};
      
      if (form.role === 'STUDENT') {
        profileData = {
          nic_number: rawProfile.nic_number || "",
          mobile: rawProfile.mobile || "",
          whatsapp: rawProfile.whatsapp || "",
          joined_on: rawProfile.joined_on || null,
          guardian_name: rawProfile.guardian_name || "",
          guardian_phone: rawProfile.guardian_phone || "",
          guardian_nic_number: rawProfile.guardian_nic_number || "",
          parent_name: rawProfile.parent_name || "",
          parent_phone: rawProfile.parent_phone || "",
          parent_whatsapp: rawProfile.parent_whatsapp || "",
          parent_nic_number: rawProfile.parent_nic_number || "",
          college_name: rawProfile.college_name || "",
          monthly_rent: rawProfile.monthly_rent || 0,
          course: rawProfile.course || "",
          year: rawProfile.year || "",
          left_on: rawProfile.left_on || null,
          utilities: Array.isArray(utilities) ? utilities : [],
        };
      } else {
        profileData = {
          nic_number: rawProfile.nic_number || "",
          mobile: rawProfile.mobile || "",
          whatsapp: rawProfile.whatsapp || "",
          joined_on: rawProfile.joined_on || null,
          designation: rawProfile.designation || "",
          pay_type: rawProfile.pay_type || "MONTHLY",
          base_salary: parseFloat(rawProfile.base_salary) || 0,
          housing_allowance: parseFloat(rawProfile.housing_allowance) || 0,
          fuel_allowance: parseFloat(rawProfile.fuel_allowance) || 0,
          rate_per_task: parseFloat(rawProfile.rate_per_task) || 0,
          bank_name: rawProfile.bank_name || "",
          iban: rawProfile.iban || "",
        };
      }

      formDataObj.append("profile", JSON.stringify(profileData));

      if (form.role === 'STUDENT' && rawProfile.security_deposit !== undefined && rawProfile.security_deposit !== "") {
        appendValue("security_deposit", rawProfile.security_deposit);
      }

      if (imageFiles.nic_front_picture) {
        formDataObj.append("profile_nic_front_picture", imageFiles.nic_front_picture);
      }
      if (imageFiles.nic_back_picture) {
        formDataObj.append("profile_nic_back_picture", imageFiles.nic_back_picture);
      }
      if (imageFiles.profile_picture) {
        formDataObj.append("profile_profile_picture", imageFiles.profile_picture);
      }

      const endpoint = user ? `users/${user.id}/` : "users/";
      const method = user ? "PATCH" : "POST";
      const token = localStorage.getItem("accessToken");

      const response = await fetch(`${api.defaults.baseURL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataObj,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const httpError = new Error("Request failed");
        httpError.response = { data: errorData, status: response.status };
        throw httpError;
      }

      alert(user ? "Profile updated!" : "User created!");
      onSave();
    } catch (err) {
      console.error("Error:", err);
      const msg = err.response?.data ? JSON.stringify(err.response.data) : "Save failed.";
      alert(`Action failed: ${msg}`);
    }
  };

  const isStudentRole = form.role === 'STUDENT';

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Block 1: Basic Information */}
      <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 16px 0' }}>Block 1: Basic Information</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group"><label className="form-label">Username</label><input className="form-input" placeholder="Auto-generate if blank" value={form.username} onChange={e => setForm({...form, username: e.target.value})} /></div>
          {!user && <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>}
          <div className="form-group"><label className="form-label">First Name</label><input className="form-input" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Role</label><select className="form-input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>{ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Branch</label><select className="form-input" value={form.hostel} onChange={e => setForm({...form, hostel: e.target.value})}><option value="">Global / Unassigned</option>{hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">NIC Number *</label><input className="form-input" required value={form.profile.nic_number} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setForm({...form, profile: {...form.profile, nic_number: (v.slice(0, 5) + (v.length > 5 ? '-' + v.slice(5, 12) : '') + (v.length > 12 ? '-' + v.slice(12, 13) : '')).slice(0, 15)}})} } /></div>
          <div className="form-group"><label className="form-label">Mobile *</label><input className="form-input" required value={form.profile.mobile} onChange={e => setForm({...form, profile: {...form.profile, mobile: e.target.value.replace(/[^0-9]/g, '')}})} /></div>
          <div className="form-group"><label className="form-label">WhatsApp *</label><input className="form-input" required value={form.profile.whatsapp} onChange={e => setForm({...form, profile: {...form.profile, whatsapp: e.target.value.replace(/[^0-9]/g, '')}})} /></div>
          
          {isStudentRole && (
            <>
              <div className="form-group"><label className="form-label">College Name *</label><input className="form-input" required value={form.profile.college_name} onChange={e => setForm({...form, profile: {...form.profile, college_name: e.target.value}})} /></div>
              <div className="form-group"><label className="form-label">Joined On *</label><input className="form-input" type="date" required value={form.profile.joined_on} onChange={e => setForm({...form, profile: {...form.profile, joined_on: e.target.value}})} /></div>
            </>
          )}
          
          {!isStudentRole && (
            <>
              <div className="form-group"><label className="form-label">Joined On</label><input className="form-input" type="date" value={form.profile.joined_on} onChange={e => setForm({...form, profile: {...form.profile, joined_on: e.target.value}})} /></div>
              <div className="form-group"><label className="form-label">Designation</label><input className="form-input" value={form.profile.designation} onChange={e => setForm({...form, profile: {...form.profile, designation: e.target.value}})} /></div>
              <div className="form-group"><label className="form-label">Pay Type</label>
                <select className="form-input" value={form.profile.pay_type} onChange={e => setForm({...form, profile: {...form.profile, pay_type: e.target.value}})}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="PER_TASK">Per Task</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Base Salary</label><input className="form-input" type="number" step="0.01" value={form.profile.base_salary} onChange={e => setForm({...form, profile: {...form.profile, base_salary: e.target.value}})} /></div>
              <div className="form-group"><label className="form-label">Housing Allowance</label><input className="form-input" type="number" step="0.01" value={form.profile.housing_allowance} onChange={e => setForm({...form, profile: {...form.profile, housing_allowance: e.target.value}})} /></div>
              <div className="form-group"><label className="form-label">Fuel Allowance</label><input className="form-input" type="number" step="0.01" value={form.profile.fuel_allowance} onChange={e => setForm({...form, profile: {...form.profile, fuel_allowance: e.target.value}})} /></div>
              <div className="form-group"><label className="form-label">Rate Per Task</label><input className="form-input" type="number" step="0.01" value={form.profile.rate_per_task} onChange={e => setForm({...form, profile: {...form.profile, rate_per_task: e.target.value}})} /></div>
              <div className="form-group"><label className="form-label">Bank Name</label><input className="form-input" value={form.profile.bank_name} onChange={e => setForm({...form, profile: {...form.profile, bank_name: e.target.value}})} /></div>
              <div className="form-group"><label className="form-label">IBAN</label><input className="form-input" value={form.profile.iban} onChange={e => setForm({...form, profile: {...form.profile, iban: e.target.value}})} /></div>
            </>
          )}
        </div>
      </div>

      {isStudentRole && (
        <>
          <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>Block 2: Guardian & Parent Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group"><label className="form-label">Guardian Name *</label><input className="form-input" required value={form.profile.guardian_name} onChange={e => setForm({...form, profile: {...form.profile, guardian_name: e.target.value}})} /></div>
              <div className="form-group"><label className="form-label">Guardian Phone *</label><input className="form-input" required value={form.profile.guardian_phone} onChange={e => setForm({...form, profile: {...form.profile, guardian_phone: e.target.value.replace(/[^0-9]/g, '')}})} /></div>
              <div className="form-group"><label className="form-label">Guardian NIC Number</label><input className="form-input" value={form.profile.guardian_nic_number} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setForm({...form, profile: {...form.profile, guardian_nic_number: (v.slice(0, 5) + (v.length > 5 ? '-' + v.slice(5, 12) : '') + (v.length > 12 ? '-' + v.slice(12, 13) : '')).slice(0, 15)}})} } /></div>
              <div className="form-group"><label className="form-label">Parent Name</label><input className="form-input" value={form.profile.parent_name} onChange={e => setForm({...form, profile: {...form.profile, parent_name: e.target.value}})} /></div>
              <div className="form-group"><label className="form-label">Parent Phone *</label><input className="form-input" required value={form.profile.parent_phone} onChange={e => setForm({...form, profile: {...form.profile, parent_phone: e.target.value.replace(/[^0-9]/g, '')}})} /></div>
              <div className="form-group"><label className="form-label">Parent WhatsApp *</label><input className="form-input" required value={form.profile.parent_whatsapp} onChange={e => setForm({...form, profile: {...form.profile, parent_whatsapp: e.target.value.replace(/[^0-9]/g, '')}})} /></div>
              <div className="form-group"><label className="form-label">Parent NIC Number</label><input className="form-input" value={form.profile.parent_nic_number} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setForm({...form, profile: {...form.profile, parent_nic_number: (v.slice(0, 5) + (v.length > 5 ? '-' + v.slice(5, 12) : '') + (v.length > 12 ? '-' + v.slice(12, 13) : '')).slice(0, 15)}})} } /></div>
            </div>
          </div>

          <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>Block 3: Academic Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group"><label className="form-label">Course</label><input className="form-input" value={form.profile.course} onChange={e => setForm({...form, profile: {...form.profile, course: e.target.value}})} /></div>
              <div className="form-group"><label className="form-label">Year</label><input className="form-input" value={form.profile.year} onChange={e => setForm({...form, profile: {...form.profile, year: e.target.value}})} /></div>
              <div className="form-group">
                <label className="form-label">Left On <span style={{ color: '#999', fontSize: '0.8rem' }}>(Optional)</span></label>
                <input className="form-input" type="date" value={form.profile.left_on || ""} onChange={e => setForm({...form, profile: {...form.profile, left_on: e.target.value}})} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Block 4: Identification Documents - FIXED IMAGE DISPLAY */}
      <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 16px 0' }}>Block 4: Identification Documents</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">NIC Front Picture</label>
            <input type="file" accept="image/*" onChange={e => handleImageChange(e, 'nic_front_picture')} />
            {(imagePreviews.nic_front_picture || user?.profile?.nic_front_picture) && (
              <div style={{ marginTop: '8px' }}>
                <img 
                  src={getImageUrl(imagePreviews.nic_front_picture || user?.profile?.nic_front_picture)} 
                  alt="NIC Front" 
                  style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '4px', border: '1px solid #e2e8f0', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
                <br />
                <small style={{ color: '#666' }}>Current: Uploaded</small>
              </div>
            )}
            {!imagePreviews.nic_front_picture && !user?.profile?.nic_front_picture && (
              <small style={{ color: '#999' }}>No image uploaded</small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">NIC Back Picture</label>
            <input type="file" accept="image/*" onChange={e => handleImageChange(e, 'nic_back_picture')} />
            {(imagePreviews.nic_back_picture || user?.profile?.nic_back_picture) && (
              <div style={{ marginTop: '8px' }}>
                <img 
                  src={getImageUrl(imagePreviews.nic_back_picture || user?.profile?.nic_back_picture)} 
                  alt="NIC Back" 
                  style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '4px', border: '1px solid #e2e8f0', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
                <br />
                <small style={{ color: '#666' }}>Current: Uploaded</small>
              </div>
            )}
            {!imagePreviews.nic_back_picture && !user?.profile?.nic_back_picture && (
              <small style={{ color: '#999' }}>No image uploaded</small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Profile Picture</label>
            <input type="file" accept="image/*" onChange={e => handleImageChange(e, 'profile_picture')} />
            {(imagePreviews.profile_picture || user?.profile?.profile_picture) && (
              <div style={{ marginTop: '8px' }}>
                <img 
                  src={getImageUrl(imagePreviews.profile_picture || user?.profile?.profile_picture)} 
                  alt="Profile" 
                  style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '50%', border: '1px solid #e2e8f0', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
                <br />
                <small style={{ color: '#666' }}>Current: Uploaded</small>
              </div>
            )}
            {!imagePreviews.profile_picture && !user?.profile?.profile_picture && (
              <small style={{ color: '#999' }}>No image uploaded</small>
            )}
          </div>
        </div>
      </div>

      {isStudentRole && (
        <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 16px 0' }}>Block 5: Rent & Charges</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group"><label className="form-label">Monthly Rent</label><input className="form-input" type="number" step="0.01" value={form.profile.monthly_rent ?? ""} onChange={e => setForm({...form, profile: {...form.profile, monthly_rent: e.target.value}})} /></div>
            <div className="form-group"><label className="form-label">Security Deposit</label><input className="form-input" type="number" step="0.01" value={form.profile.security_deposit ?? ""} onChange={e => setForm({...form, profile: {...form.profile, security_deposit: e.target.value}})} /></div>
          </div>
          <UtilityChargesUI utilities={utilities} onChange={setUtilities} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{user ? "Save" : "Create"}</button>
        <button type="button" onClick={onCancel} className="btn btn-soft" style={{ flex: 1 }}>Cancel</button>
      </div>
    </form>
  );
}