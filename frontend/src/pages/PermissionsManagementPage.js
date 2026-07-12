// src/pages/PermissionsManagementPage.js
import React, { useEffect, useState } from "react";
import api from "../api";

const ROLES = ["SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER", "PARTNER", "STAFF", "STUDENT"];
const MODULES = [
  "DASHBOARD", "INVENTORY", "PROCUREMENT", "VISUAL_AUDIT", "INVENTORY_KPI",
  "PAYROLL", "EMPLOYEES", "ASSETS", "FEES", "USER_MGMT", "TASKS", "BALANCE_SHEET"
];

export default function PermissionsManagementPage() {
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSubmitting] = useState(false);

  // "ROLE" or user_id
  const [targetType, setTargetType] = useState("ROLE");
  const [selectedUser, setSelectedUser] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [permRes, userRes] = await Promise.all([
        api.get("module-permissions/"),
        api.get("users/")
      ]);
      setPermissions(permRes.data.results || permRes.data);
      setUsers(userRes.data.results || userRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getPermission = (role, module, userId = null) => {
    if (userId) {
      return permissions.find(p => p.user === parseInt(userId) && p.module_name === module) || {
        user: parseInt(userId), module_name: module, can_view: false, can_add: false, can_edit: false, can_delete: false
      };
    }
    return permissions.find(p => p.role === role && !p.user && p.module_name === module) || {
      role, module_name: module, can_view: false, can_add: false, can_edit: false, can_delete: false
    };
  };

  const togglePermission = (module, field, role = null, userId = null) => {
    let updated = [...permissions];
    const match = userId
      ? p => p.user === parseInt(userId) && p.module_name === module
      : p => p.role === role && !p.user && p.module_name === module;

    const existingIdx = updated.findIndex(match);

    if (existingIdx > -1) {
      updated[existingIdx] = { ...updated[existingIdx], [field]: !updated[existingIdx][field] };
    } else {
      updated.push({
        role: userId ? null : role,
        user: userId ? parseInt(userId) : null,
        module_name: module,
        can_view: false, can_add: false, can_edit: false, can_delete: false,
        [field]: true
      });
    }
    setPermissions(updated);
  };

  async function saveAll() {
    setSubmitting(true);
    try {
      // Filter permissions to send relevant ones based on current view to avoid accidental data loss?
      // No, bulk_update handles whatever we send. Let's send the full state.
      await api.post("module-permissions/bulk_update/", permissions);
      alert("Portal access rights updated successfully!");
      loadData();
    } catch (err) {
      alert("Failed to update permissions.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page management-page"><div className="card"><p>Loading Security Matrix...</p></div></div>;

  return (
    <div className="page management-page">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Access Control Command Center</h2>
            <p className="card-subtext">Manage Global Role permissions or specific User overrides.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
             <div className="filter-group">
                <label className="filter-label">Management Mode</label>
                <select className="filter-select" value={targetType} onChange={e => setTargetType(e.target.value)}>
                   <option value="ROLE">Global (By Role)</option>
                   <option value="USER">Individual User Overrides</option>
                </select>
             </div>

             {targetType === 'USER' && (
                <div className="filter-group">
                  <label className="filter-label">Select User</label>
                  <select className="filter-select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                     <option value="">-- Choose User --</option>
                     {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
                  </select>
                </div>
             )}

             <button onClick={saveAll} className="btn btn-primary" style={{ marginTop: '18px' }} disabled={saving || (targetType === 'USER' && !selectedUser)}>
                {saving ? "Deploying..." : "💾 Save Changes"}
             </button>
          </div>
        </div>

        <div className="table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <table className="table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ background: '#f8fafc', position: 'sticky', left: 0, zIndex: 10 }}>Module / Feature</th>
                {targetType === 'ROLE' ? (
                  ROLES.map(role => (
                    <th key={role} style={{ textAlign: 'center', background: '#f8fafc', minWidth: '120px' }}>
                      {role.replace('_', ' ')}
                    </th>
                  ))
                ) : (
                  <th style={{ textAlign: 'center', background: '#f8fafc', minWidth: '200px' }}>
                    User Permissions Override
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {MODULES.map(mod => (
                <tr key={mod}>
                  <td style={{ fontWeight: 700, background: '#fff', position: 'sticky', left: 0, zIndex: 5, borderRight: '2px solid #f1f5f9' }}>
                    {mod.replace('_', ' ')}
                  </td>

                  {targetType === 'ROLE' ? (
                    ROLES.map(role => {
                      const p = getPermission(role, mod);
                      return (
                        <td key={`${role}-${mod}`} style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                             <PermToggle label="VIEW" active={p.can_view} onClick={() => togglePermission(mod, 'can_view', role)} />
                             <PermToggle label="ADD" active={p.can_add} onClick={() => togglePermission(mod, 'can_add', role)} />
                             <PermToggle label="EDIT" active={p.can_edit} onClick={() => togglePermission(mod, 'can_edit', role)} />
                             <PermToggle label="DEL" active={p.can_delete} onClick={() => togglePermission(mod, 'can_delete', role)} />
                          </div>
                        </td>
                      );
                    })
                  ) : (
                    <td style={{ padding: '12px' }}>
                       {selectedUser ? (
                          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                             <PermToggle label="VIEW" active={getPermission(null, mod, selectedUser).can_view} onClick={() => togglePermission(mod, 'can_view', null, selectedUser)} />
                             <PermToggle label="ADD" active={getPermission(null, mod, selectedUser).can_add} onClick={() => togglePermission(mod, 'can_add', null, selectedUser)} />
                             <PermToggle label="EDIT" active={getPermission(null, mod, selectedUser).can_edit} onClick={() => togglePermission(mod, 'can_edit', null, selectedUser)} />
                             <PermToggle label="DEL" active={getPermission(null, mod, selectedUser).can_delete} onClick={() => togglePermission(mod, 'can_delete', null, selectedUser)} />
                          </div>
                       ) : (
                          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>Select a user to manage overrides</div>
                       )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {targetType === 'USER' && selectedUser && (
           <div style={{ marginTop: '20px', padding: '16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.85rem' }}>
              💡 <b>Note on Overrides:</b> User-specific permissions will completely replace their role-based permissions for the selected modules.
           </div>
        )}
      </div>
    </div>
  );
}

function PermToggle({ label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        fontSize: '0.6rem',
        fontWeight: 800,
        padding: '2px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        width: '50px',
        textAlign: 'center',
        background: active ? 'var(--success)' : '#f1f5f9',
        color: active ? '#fff' : '#94a3b8',
        transition: 'all 0.2s ease',
        border: active ? '1px solid var(--success)' : '1px solid #e2e8f0'
      }}
    >
      {label}
    </div>
  );
}
