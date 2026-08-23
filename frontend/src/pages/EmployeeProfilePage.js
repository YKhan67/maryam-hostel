// src/pages/EmployeeProfilePage.js
import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";

export default function EmployeeProfilePage() {
  const { user: currentUser } = useContext(AuthContext);
  const isReadOnly = currentUser?.role === 'PARTNER';

  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [empRes, userRes] = await Promise.all([api.get("payroll/employees/"), api.get("users/")]);
      setEmployees(empRes.data.results || empRes.data);
      setUsers((userRes.data.results || userRes.data).filter(u => u.role !== 'STUDENT'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Filter employees based on status
  const filteredEmployees = employees.filter(emp => {
    const user = users.find(u => u.id === emp.user);
    
    if (statusFilter === "ACTIVE") {
      return user?.is_active === true;
    } else if (statusFilter === "INACTIVE") {
      return user?.is_active === false;
    }
    return true;
  });

  // Calculate total salary (base + allowances)
  const calculateTotalSalary = (emp) => {
    const base = parseFloat(emp.base_salary) || 0;
    const housing = parseFloat(emp.housing_allowance) || 0;
    const fuel = parseFloat(emp.fuel_allowance) || 0;
    return base + housing + fuel;
  };

  if (loading) return <p>Syncing...</p>;

  return (
    <div className="page management-page">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Active Personnel</h2>
            <p className="card-subtext">Manage staff compensation packages.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="filter-group" style={{ marginBottom: 0 }}>
              <label className="filter-label" style={{ fontSize: '0.7rem', marginBottom: '2px' }}>Status</label>
              <select 
                className="filter-select" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ minWidth: '130px' }}
              >
                <option value="ALL">All Employees</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            {!isReadOnly && (
              <button 
                onClick={() => { setEditingEmployee(null); setShowModal(true); }} 
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
              >
                ➕ Register Employee
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing {filteredEmployees.length} of {employees.length} employees
          {statusFilter === "ACTIVE" && " (Active only)"}
          {statusFilter === "INACTIVE" && " (Inactive only)"}
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Designation</th>
                <th>Pay Type</th>
                <th>Salary</th>
                <th>Branch</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {statusFilter === "ALL" && "No employees registered yet."}
                    {statusFilter === "ACTIVE" && "No active employees found."}
                    {statusFilter === "INACTIVE" && "No inactive employees found."}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const user = users.find(u => u.id === emp.user);
                  const isActive = user?.is_active !== false;
                  const baseSalary = parseFloat(emp.base_salary) || 0;
                  const housingAllowance = parseFloat(emp.housing_allowance) || 0;
                  const fuelAllowance = parseFloat(emp.fuel_allowance) || 0;
                  const totalSalary = baseSalary + housingAllowance + fuelAllowance;
                  
                  return (
                    <tr key={emp.id} style={{ opacity: isActive ? 1 : 0.6 }}>
                      <td>
                        <b>{emp.full_name}</b>
                        <br/>
                        <small>{emp.username}</small>
                      </td>
                      <td>{emp.designation}</td>
                      <td><span className="badge badge-soft">{emp.pay_type}</span></td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--brand-gold)' }}>
                          Rs {totalSalary.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Base: Rs {baseSalary.toLocaleString()} 
                          {housingAllowance > 0 && ` | Housing: Rs ${housingAllowance.toLocaleString()}`}
                          {fuelAllowance > 0 && ` | Fuel: Rs ${fuelAllowance.toLocaleString()}`}
                        </div>
                      </td>
                      <td>{emp.hostel_name || 'Global'}</td>
                      <td>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!isReadOnly && (
                          <button 
                            onClick={() => { setEditingEmployee(emp); setShowModal(true); }} 
                            className="btn btn-soft" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            🛠️ Edit
                          </button>
                        )}
                        {isReadOnly && <span className="badge">Read Only</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isReadOnly && showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
             <h2>{editingEmployee ? `Edit: ${editingEmployee.full_name}` : "Register New Employee"}</h2>
             <EmployeeForm users={users} employee={editingEmployee} onSave={() => { setShowModal(false); loadData(); }} onCancel={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeForm({ users, employee, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    user: employee?.user || "",
    designation: employee?.designation || "",
    pay_type: employee?.pay_type || "MONTHLY",
    base_salary: employee?.base_salary || 0,
    housing_allowance: employee?.housing_allowance || 0,
    fuel_allowance: employee?.fuel_allowance || 0,
    rate_per_task: employee?.rate_per_task || 0,
    bank_name: employee?.bank_name || "",
    iban: employee?.iban || ""
  });

  // Calculate total for display
  const totalSalary = (parseFloat(formData.base_salary) || 0) + 
                      (parseFloat(formData.housing_allowance) || 0) + 
                      (parseFloat(formData.fuel_allowance) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (employee) await api.patch(`payroll/employees/${employee.id}/`, formData);
      else await api.post("payroll/employees/", formData);
      onSave();
    } catch (err) { 
      console.error(err);
      alert("Action failed. " + (err.response?.data?.detail || ""));
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="form-group">
          <label className="form-label">Link User</label>
          <select 
            className="form-input" 
            disabled={!!employee} 
            required 
            value={formData.user} 
            onChange={e => setFormData({...formData, user: e.target.value})}
          >
            <option value="">Select</option>
            {users.map(u => {
              const userStatus = u.is_active ? '✅ Active' : '🚫 Inactive';
              return (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.role}) - {userStatus}
                </option>
              );
            })}
          </select>
          {employee && <small style={{ color: 'var(--text-muted)' }}>User cannot be changed after creation.</small>}
        </div>
        <div className="form-group">
          <label className="form-label">Job Designation</label>
          <input 
            className="form-input" 
            required 
            value={formData.designation} 
            onChange={e => setFormData({...formData, designation: e.target.value})} 
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">Pay Type</label>
          <select 
            className="form-input" 
            value={formData.pay_type} 
            onChange={e => setFormData({...formData, pay_type: e.target.value})}
          >
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
            <option value="HOURLY">Hourly</option>
            <option value="PER_TASK">Per Task</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Base Salary</label>
          <input 
            type="number" 
            className="form-input" 
            value={formData.base_salary} 
            onChange={e => setFormData({...formData, base_salary: parseFloat(e.target.value) || 0})} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Rate Per Task</label>
          <input 
            type="number" 
            className="form-input" 
            value={formData.rate_per_task} 
            onChange={e => setFormData({...formData, rate_per_task: parseFloat(e.target.value) || 0})} 
            disabled={formData.pay_type !== 'PER_TASK'}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">Housing Allowance</label>
          <input 
            type="number" 
            className="form-input" 
            value={formData.housing_allowance} 
            onChange={e => setFormData({...formData, housing_allowance: parseFloat(e.target.value) || 0})} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Fuel Allowance</label>
          <input 
            type="number" 
            className="form-input" 
            value={formData.fuel_allowance} 
            onChange={e => setFormData({...formData, fuel_allowance: parseFloat(e.target.value) || 0})} 
          />
        </div>
      </div>

      {/* Display total salary */}
      <div style={{ 
        padding: '12px 16px', 
        background: '#f0fdf4', 
        borderRadius: '8px', 
        border: '1px solid #bbf7d0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Total Compensation:</span>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#16a34a' }}>
          Rs {totalSalary.toLocaleString()}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">Bank Name</label>
          <input 
            className="form-input" 
            value={formData.bank_name} 
            onChange={e => setFormData({...formData, bank_name: e.target.value})} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">IBAN</label>
          <input 
            className="form-input" 
            value={formData.iban} 
            onChange={e => setFormData({...formData, iban: e.target.value})} 
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
        <button type="button" onClick={onCancel} className="btn btn-soft" style={{ flex: 1 }}>Cancel</button>
      </div>
    </form>
  );
}