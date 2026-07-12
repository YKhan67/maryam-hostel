// src/pages/PayrollDashboardPage.js
import React, { useEffect, useState, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { formatPKR } from "../utils/formatPKR";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function PayrollDashboardPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { check } = usePermissions();
  const isReadOnly = !check("PAYROLL", "add") && !check("PAYROLL", "edit");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0]);

  // Filtering
  const [filterYear, setFilterYear] = useState("ALL");
  const [filterMonth, setFilterMonth] = useState("ALL");

  useEffect(() => { loadRecords(); }, []);

  async function loadRecords() {
    setLoading(true);
    try {
      const res = await api.get("payroll/records/");
      setRecords(res.data.results || res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function generateDraft() {
    try {
      await api.post("payroll/records/generate_draft/", { month: selectedMonth });
      alert("Draft generated!");
      loadRecords();
    } catch (err) { alert(err.response?.data?.detail || "Generation failed."); }
  }

  async function handleStatus(id, action) {
    try {
      let backendAction = action === 'approve' ? 'authorize' : action === 'reject' ? 'cancel' : 'disburse';
      await api.post(`payroll/records/${id}/${backendAction}/`);
      loadRecords();
    } catch (err) { alert("Failed."); }
  }

  const availableYears = useMemo(() => [...new Set(records.map(r => new Date(r.month).getFullYear()))].sort((a, b) => b - a), [records]);

  const filteredRecords = useMemo(() => records.filter(r => {
    const d = new Date(r.month);
    return (filterYear === "ALL" || d.getFullYear().toString() === filterYear) && (filterMonth === "ALL" || (d.getMonth() + 1).toString() === filterMonth);
  }), [records, filterYear, filterMonth]);

  if (loading) return <p>Loading Finance...</p>;

  return (
    <>

      {/* HEADER BAR */}
      <div className="card" style={{ marginBottom: '16px', padding: '12px 20px' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Monthly Payroll</h3>
            {!isReadOnly && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="date" className="filter-input" style={{ width: '140px', height: '32px' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                <button onClick={generateDraft} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Generate Draft</button>
              </div>
            )}
         </div>
      </div>

      {/* FILTER BAR - COMPACT */}
      <div className="card" style={{ marginBottom: '20px', padding: '8px 16px', background: '#f8fafc' }}>
         <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>FILTER BY:</span>
            <select className="filter-select" style={{ height: '30px', fontSize: '0.8rem' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
               <option value="ALL">All Years</option>
               {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="filter-select" style={{ height: '30px', fontSize: '0.8rem' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
               <option value="ALL">All Months</option>
               {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
         </div>
      </div>

      {/* COMPACT CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {filteredRecords.map(record => (
          <div key={record.id} className="card" style={{
            borderLeft: `5px solid ${record.status === 'PAID' ? '#10b981' : record.status === 'REJECTED' ? '#ef4444' : '#eab308'}`,
            padding: '12px 16px', marginBottom: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
               <span style={{ fontWeight: 800, fontSize: '1rem' }}>{new Date(record.month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
               <span className={`badge ${record.status === 'PAID' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.6rem' }}>{record.status}</span>
            </div>

            <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
               <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>TOTAL PAYOUT</div>
               <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{formatPKR(record.calculated_total || record.total_net_payout)}</div>
               <div style={{ fontSize: '0.65rem', marginTop: '4px' }}>Staff Count: <b>{record.slips?.length || 0}</b></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
               {!isReadOnly && record.status === 'DRAFT' && (
                 <div style={{ display: 'flex', gap: '5px' }}>
                   <button onClick={() => handleStatus(record.id, 'approve')} className="btn btn-primary" style={{ flex: 1, height: '30px', fontSize: '0.75rem', padding: 0 }}>Authorize</button>
                   <button onClick={() => handleStatus(record.id, 'reject')} className="btn btn-soft" style={{ flex: 1, height: '30px', fontSize: '0.75rem', padding: 0, color: '#ef4444' }}>Reject</button>
                 </div>
               )}
               {!isReadOnly && record.status === 'APPROVED' && (
                 <button onClick={() => handleStatus(record.id, 'mark_as_paid')} className="btn btn-primary" style={{ height: '30px', fontSize: '0.75rem', padding: 0, background: '#10b981' }}>Disburse Cash</button>
               )}
               <button onClick={() => navigate(`/payroll-slips/${record.id}`)} className="btn btn-soft" style={{ height: '30px', fontSize: '0.75rem', padding: 0 }}>View Details</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
