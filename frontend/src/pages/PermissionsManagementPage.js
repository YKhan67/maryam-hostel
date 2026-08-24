// src/pages/PermissionsManagementPage.js
import React, { useEffect, useState } from "react";
import api from "../api";

const ROLES = ["SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER", "PARTNER", "STAFF", "STUDENT"];

// Modules organized by sidebar hierarchy
const MODULES = [
  // Strategic Management
  { id: "DASHBOARD", label: "📊 Management Dashboard", group: "Strategic Management" },
  { id: "BALANCE_SHEET", label: "⚖️ Balance Sheet", group: "Strategic Management" },
  
  // Meal Management
  { id: "MEAL_MENU", label: "📋 Meal Menu", group: "🍽️ Meal Management" },
  { id: "MEAL_MANAGEMENT", label: "📅 Schedule Manager", group: "🍽️ Meal Management" },
  { id: "MEAL_FEEDBACK", label: "⭐ Meal Feedback", group: "🍽️ Meal Management" },
  { id: "RECIPE_MANAGEMENT", label: "📋 Recipe Management", group: "🍽️ Meal Management" },
  { id: "GROCERY_MANAGEMENT", label: "🛒 Grocery Management", group: "🍽️ Meal Management" },
  
  // Hostel Operations
  { id: "TASKS", label: "🛠️ Staff Tasks", group: "Hostel Operations" },
  
  // HR & Payroll
  { id: "PAYROLL", label: "💸 Payroll Master", group: "HR & Payroll" },
  { id: "EMPLOYEES", label: "👥 Employee Profiles", group: "HR & Payroll" },
  
  // Logistics & Assets
  { id: "ASSETS", label: "🚜 Fixed Assets", group: "Logistics & Assets" },
  { id: "INVENTORY", label: "📦 Inventory Logs", group: "Logistics & Assets" },
  { id: "PROCUREMENT", label: "🛒 Smart Re-order", group: "Logistics & Assets" },
  { id: "VISUAL_AUDIT", label: "📷 Visual Audit", group: "Logistics & Assets" },
  { id: "INVENTORY_KPI", label: "📈 Inventory KPIs", group: "Logistics & Assets" },
  
  // Fee Management
  { id: "FEES", label: "🧾 Fee Controls", group: "Fee Management" },
  
  // System (Super Admin only)
  { id: "USER_MGMT", label: "👤 User Management", group: "System" },
];

// Group modules by their group
const groupedModules = MODULES.reduce((acc, module) => {
  if (!acc[module.group]) {
    acc[module.group] = [];
  }
  acc[module.group].push(module);
  return acc;
}, {});

const GROUP_ORDER = [
  "Strategic Management",
  "🍽️ Meal Management",
  "Hostel Operations",
  "HR & Payroll",
  "Logistics & Assets",
  "Fee Management",
  "System"
];

export default function PermissionsManagementPage() {
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [targetType, setTargetType] = useState("ROLE");
  const [selectedUser, setSelectedUser] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [permRes, userRes] = await Promise.all([
        api.get("module-permissions/"),
        api.get("users/")
      ]);
      setPermissions(permRes.data.results || permRes.data);
      setUsers(userRes.data.results || userRes.data);
    } catch (err) {
      console.error("Error loading permissions:", err);
      setError("Failed to load permissions. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  // FIXED: Correct parameter order - role, module, userId
  const getPermission = (role, moduleId, userId = null) => {
    if (userId) {
      const found = permissions.find(p => p.user === parseInt(userId) && p.module_name === moduleId);
      return found || {
        user: parseInt(userId), 
        module_name: moduleId, 
        can_view: false, 
        can_add: false, 
        can_edit: false, 
        can_delete: false
      };
    }
    const found = permissions.find(p => p.role === role && !p.user && p.module_name === moduleId);
    return found || {
      role, 
      module_name: moduleId, 
      can_view: false, 
      can_add: false, 
      can_edit: false, 
      can_delete: false
    };
  };

  // FIXED: Correct parameter order - moduleId, field, role, userId
  const togglePermission = (moduleId, field, role = null, userId = null) => {
    let updated = [...permissions];
    const match = userId
      ? p => p.user === parseInt(userId) && p.module_name === moduleId
      : p => p.role === role && !p.user && p.module_name === moduleId;

    const existingIdx = updated.findIndex(match);

    if (existingIdx > -1) {
      updated[existingIdx] = { ...updated[existingIdx], [field]: !updated[existingIdx][field] };
    } else {
      const newPermission = {
        module_name: moduleId,
        can_view: false, 
        can_add: false, 
        can_edit: false, 
        can_delete: false,
        [field]: true
      };
      
      if (userId) {
        newPermission.user = parseInt(userId);
        newPermission.role = null;
      } else {
        newPermission.role = role;
        newPermission.user = null;
      }
      
      updated.push(newPermission);
    }
    setPermissions(updated);
    setError(null);
    setSuccess(null);
  };

  async function saveAll() {
    if (targetType === 'USER' && !selectedUser) {
      setError("Please select a user before saving.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      let permissionsToSave = permissions;
      
      if (targetType === 'USER' && selectedUser) {
        permissionsToSave = permissions.filter(p => p.user === parseInt(selectedUser));
      }
      
      if (targetType === 'ROLE') {
        permissionsToSave = permissions.filter(p => p.role !== null && !p.user);
      }
      
      await api.post("module-permissions/bulk_update/", permissionsToSave);
      setSuccess("✅ Portal access rights updated successfully!");
      await loadData();
    } catch (err) {
      console.error("Error saving permissions:", err);
      let errorMsg = "Failed to update permissions.";
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.response?.status === 403) {
        errorMsg = "❌ You don't have permission to modify permissions.";
      } else if (err.response?.status === 400) {
        errorMsg = "❌ Invalid request. Please check your selections.";
      }
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  const handleTargetTypeChange = (type) => {
    setTargetType(type);
    setSelectedUser("");
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="page management-page">
        <div className="card">
          <p>Loading Security Matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page management-page">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Access Control Command Center</h2>
            <p className="card-subtext">Manage Global Role permissions or specific User overrides.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
             <div className="filter-group">
                <label className="filter-label">Management Mode</label>
                <select 
                  className="filter-select" 
                  value={targetType} 
                  onChange={e => handleTargetTypeChange(e.target.value)}
                >
                   <option value="ROLE">Global (By Role)</option>
                   <option value="USER">Individual User Overrides</option>
                </select>
             </div>

             {targetType === 'USER' && (
                <div className="filter-group">
                  <label className="filter-label">Select User</label>
                  <select 
                    className="filter-select" 
                    value={selectedUser} 
                    onChange={e => setSelectedUser(e.target.value)}
                  >
                     <option value="">-- Choose User --</option>
                     {users.map(u => (
                       <option key={u.id} value={u.id}>
                         {u.username} ({u.role}) {u.is_active ? '✅' : '🚫'}
                       </option>
                     ))}
                  </select>
                </div>
             )}

             <button 
               onClick={saveAll} 
               className="btn btn-primary" 
               style={{ marginTop: '18px' }} 
               disabled={saving || (targetType === 'USER' && !selectedUser)}
             >
                {saving ? "Deploying..." : "💾 Save Changes"}
             </button>
          </div>
        </div>

        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '8px', 
            color: '#dc2626', 
            marginBottom: '16px',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: '8px', 
            color: '#16a34a', 
            marginBottom: '16px',
            fontSize: '0.9rem'
          }}>
            {success}
          </div>
        )}

        <div className="table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'auto' }}>
          <table className="table" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ 
                  background: '#f8fafc', 
                  position: 'sticky', 
                  left: 0, 
                  zIndex: 10, 
                  minWidth: '180px',
                  textAlign: 'left'
                }}>
                  Module / Feature
                </th>
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
              {GROUP_ORDER.map(groupName => {
                const modulesInGroup = groupedModules[groupName] || [];
                if (modulesInGroup.length === 0) return null;
                
                return (
                  <React.Fragment key={groupName}>
                    {/* Group Header Row */}
                    <tr>
                      <td 
                        colSpan={targetType === 'ROLE' ? ROLES.length + 1 : 2}
                        style={{ 
                          background: '#f1f5f9', 
                          fontWeight: 800, 
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          color: '#475569',
                          padding: '8px 16px',
                          borderBottom: '2px solid #e2e8f0'
                        }}
                      >
                        {groupName}
                      </td>
                    </tr>
                    {/* Module Rows */}
                    {modulesInGroup.map(module => {
                      const moduleId = module.id;
                      return (
                        <tr key={moduleId}>
                          <td style={{ 
                            fontWeight: 600, 
                            background: '#fff', 
                            position: 'sticky', 
                            left: 0, 
                            zIndex: 5, 
                            borderRight: '2px solid #f1f5f9',
                            minWidth: '150px',
                            paddingLeft: '32px',
                            fontSize: '0.85rem'
                          }}>
                            {module.label}
                          </td>

                          {targetType === 'ROLE' ? (
                            ROLES.map(role => {
                              const p = getPermission(role, moduleId);
                              return (
                                <td key={`${role}-${moduleId}`} style={{ padding: '8px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                    <PermToggle 
                                      label="VIEW" 
                                      active={p.can_view} 
                                      onClick={() => togglePermission(moduleId, 'can_view', role)} 
                                    />
                                    <PermToggle 
                                      label="ADD" 
                                      active={p.can_add} 
                                      onClick={() => togglePermission(moduleId, 'can_add', role)} 
                                    />
                                    <PermToggle 
                                      label="EDIT" 
                                      active={p.can_edit} 
                                      onClick={() => togglePermission(moduleId, 'can_edit', role)} 
                                    />
                                    <PermToggle 
                                      label="DEL" 
                                      active={p.can_delete} 
                                      onClick={() => togglePermission(moduleId, 'can_delete', role)} 
                                    />
                                  </div>
                                </td>
                              );
                            })
                          ) : (
                            <td style={{ padding: '8px' }}>
                               {selectedUser ? (
                                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                     <PermToggle 
                                       label="VIEW" 
                                       active={getPermission(null, moduleId, selectedUser).can_view} 
                                       onClick={() => togglePermission(moduleId, 'can_view', null, selectedUser)} 
                                     />
                                     <PermToggle 
                                       label="ADD" 
                                       active={getPermission(null, moduleId, selectedUser).can_add} 
                                       onClick={() => togglePermission(moduleId, 'can_add', null, selectedUser)} 
                                     />
                                     <PermToggle 
                                       label="EDIT" 
                                       active={getPermission(null, moduleId, selectedUser).can_edit} 
                                       onClick={() => togglePermission(moduleId, 'can_edit', null, selectedUser)} 
                                     />
                                     <PermToggle 
                                       label="DEL" 
                                       active={getPermission(null, moduleId, selectedUser).can_delete} 
                                       onClick={() => togglePermission(moduleId, 'can_delete', null, selectedUser)} 
                                     />
                                  </div>
                               ) : (
                                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                                    Select a user to manage overrides
                                  </div>
                               )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {targetType === 'USER' && selectedUser && (
           <div style={{ 
             marginTop: '20px', 
             padding: '16px', 
             background: '#eff6ff', 
             borderRadius: '8px', 
             border: '1px solid #bfdbfe', 
             color: '#1e40af', 
             fontSize: '0.85rem' 
           }}>
              💡 <b>Note on Overrides:</b> User-specific permissions will completely replace their role-based permissions for the selected modules.
           </div>
        )}

        {targetType === 'ROLE' && (
          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            background: '#f0fdf4', 
            borderRadius: '8px', 
            border: '1px solid #bbf7d0', 
            color: '#166534', 
            fontSize: '0.85rem' 
          }}>
            💡 <b>Note:</b> Changes made here will apply to all users with the selected role. Use "Individual User Overrides" for specific exceptions.
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
        fontSize: '0.55rem',
        fontWeight: 800,
        padding: '3px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        minWidth: '38px',
        textAlign: 'center',
        background: active ? '#22c55e' : '#f1f5f9',
        color: active ? '#fff' : '#94a3b8',
        transition: 'all 0.2s ease',
        border: active ? '1px solid #16a34a' : '1px solid #e2e8f0',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.target.style.background = '#e2e8f0';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.target.style.background = '#f1f5f9';
        }
      }}
    >
      {label}
    </div>
  );
}