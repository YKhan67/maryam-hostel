// src/pages/PayrollDashboardPage.js
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { usePermissions } from "../hooks/usePermissions";
import { formatPKR } from "../utils/formatPKR";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function PayrollDashboardPage() {
  const navigate = useNavigate();
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
    } catch (err) { 
      console.error("Error loading payroll records:", err);
    }
    finally { setLoading(false); }
  }

  async function generateDraft() {
    try {
      await api.post("payroll/records/generate_draft/", { month: selectedMonth });
      alert("Draft generated successfully!");
      loadRecords();
    } catch (err) { 
      alert(err.response?.data?.detail || "Generation failed."); 
    }
  }

  async function handleStatus(id, action) {
    try {
      let backendAction = action === 'approve' ? 'authorize' : action === 'reject' ? 'cancel' : 'disburse';
      await api.post(`payroll/records/${id}/${backendAction}/`);
      loadRecords();
    } catch (err) { 
      alert("Failed to update status."); 
    }
  }

  const availableYears = useMemo(() => 
    [...new Set(records.map(r => new Date(r.month).getFullYear()))].sort((a, b) => b - a), 
    [records]
  );

  const filteredRecords = useMemo(() => records.filter(r => {
    const d = new Date(r.month);
    const yearMatch = filterYear === "ALL" || d.getFullYear().toString() === filterYear;
    const monthMatch = filterMonth === "ALL" || (d.getMonth() + 1).toString() === filterMonth;
    return yearMatch && monthMatch;
  }), [records, filterYear, filterMonth]);

  // Calculate totals - ONLY for APPROVED and PAID records
  const approvedPaidRecords = filteredRecords.filter(r => r.status === 'APPROVED' || r.status === 'PAID');
  
  const totalGrossSalary = approvedPaidRecords.reduce((sum, r) => sum + (parseFloat(r.total_gross_salary) || 0), 0);
  const totalAdvances = approvedPaidRecords.reduce((sum, r) => sum + (parseFloat(r.total_advances_deducted) || 0), 0);
  const totalNetPayout = approvedPaidRecords.reduce((sum, r) => sum + (parseFloat(r.total_net_payout) || 0), 0);

  // Count records by status
  const draftCount = filteredRecords.filter(r => r.status === 'DRAFT').length;
  const approvedCount = filteredRecords.filter(r => r.status === 'APPROVED').length;
  const paidCount = filteredRecords.filter(r => r.status === 'PAID').length;
  const rejectedCount = filteredRecords.filter(r => r.status === 'REJECTED' || r.status === 'CANCELLED').length;

  if (loading) return <p>Loading Finance...</p>;

  return (
    <div className="page management-page">
      {/* HEADER BAR */}
      <div className="card" style={{ marginBottom: '16px', padding: '12px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>Monthly Payroll</h3>
          {!isReadOnly && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input 
                type="date" 
                className="filter-input" 
                style={{ width: '140px', height: '32px' }} 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)} 
              />
              <button 
                onClick={generateDraft} 
                className="btn btn-primary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Generate Draft
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="card" style={{ marginBottom: '20px', padding: '8px 16px', background: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>FILTER BY:</span>
          <select 
            className="filter-select" 
            style={{ height: '30px', fontSize: '0.8rem' }} 
            value={filterYear} 
            onChange={e => setFilterYear(e.target.value)}
          >
            <option value="ALL">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select 
            className="filter-select" 
            style={{ height: '30px', fontSize: '0.8rem' }} 
            value={filterMonth} 
            onChange={e => setFilterMonth(e.target.value)}
          >
            <option value="ALL">All Months</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Showing {filteredRecords.length} records
          </span>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '8px 12px', borderLeft: '4px solid #eab308' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Drafts</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{draftCount}</div>
        </div>
        <div className="card" style={{ padding: '8px 12px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Approved</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>{approvedCount}</div>
        </div>
        <div className="card" style={{ padding: '8px 12px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Paid</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{paidCount}</div>
        </div>
        <div className="card" style={{ padding: '8px 12px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Rejected</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{rejectedCount}</div>
        </div>
      </div>

      {/* Financial Summary Cards - Only Approved & Paid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '12px 16px', background: '#f8fafc' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Total Gross Salary</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{formatPKR(totalGrossSalary)}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{approvedPaidRecords.length} approved/paid records</div>
        </div>
        <div className="card" style={{ padding: '12px 16px', borderLeft: '3px solid #ef4444', background: '#f8fafc' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Total Advances Deducted</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626' }}>{formatPKR(totalAdvances)}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>From approved/paid records</div>
        </div>
        <div className="card" style={{ padding: '12px 16px', borderLeft: '3px solid #10b981', background: '#f0fdf4' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>✅ Total Net Payout</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a' }}>{formatPKR(totalNetPayout)}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Approved & Paid only</div>
        </div>
      </div>

      {/* Payroll Records Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filteredRecords.map(record => {
          const grossSalary = parseFloat(record.total_gross_salary) || 0;
          const advancesDeducted = parseFloat(record.total_advances_deducted) || 0;
          const netPayout = parseFloat(record.total_net_payout) || 0;
          const advanceCount = record.advance_count || 0;
          const employeeCount = record.slips?.length || 0;
          
          // Status color and label mapping
          let statusColor = '#eab308';
          let statusLabel = '📝 DRAFT';
          let statusClass = 'badge-warning';
          
          if (record.status === 'APPROVED') {
            statusColor = '#3b82f6';
            statusLabel = '📋 APPROVED';
            statusClass = 'badge-info';
          } else if (record.status === 'PAID') {
            statusColor = '#10b981';
            statusLabel = '✅ PAID';
            statusClass = 'badge-success';
          } else if (record.status === 'REJECTED' || record.status === 'CANCELLED') {
            statusColor = '#ef4444';
            statusLabel = '❌ REJECTED';
            statusClass = 'badge-danger';
          }
          
          return (
            <div 
              key={record.id} 
              className="card" 
              style={{
                borderLeft: `5px solid ${statusColor}`,
                padding: '12px 16px', 
                marginBottom: 0,
                opacity: (record.status === 'REJECTED' || record.status === 'CANCELLED') ? 0.6 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>
                  {new Date(record.month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </span>
                <span className={`badge ${statusClass}`} style={{ fontSize: '0.6rem' }}>
                  {statusLabel}
                </span>
              </div>

              {/* Salary Breakdown */}
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                  <span style={{ opacity: 0.6 }}>Gross Salary</span>
                  <span style={{ fontWeight: 700 }}>{formatPKR(grossSalary)}</span>
                </div>
                
                {/* Advance Deduction - Show only if > 0 */}
                {advancesDeducted > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '0.7rem', 
                    color: '#dc2626', 
                    borderTop: '1px dashed #e2e8f0', 
                    marginTop: '4px', 
                    paddingTop: '4px' 
                  }}>
                    <span>Advances Deducted ({advanceCount})</span>
                    <span style={{ fontWeight: 700 }}>- {formatPKR(advancesDeducted)}</span>
                  </div>
                )}
                
                {/* Net Payout */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '0.85rem', 
                  borderTop: '2px solid #e2e8f0', 
                  marginTop: '6px', 
                  paddingTop: '6px', 
                  fontWeight: 800 
                }}>
                  <span>Net Payout</span>
                  <span style={{ color: record.status === 'REJECTED' ? '#ef4444' : '#16a34a' }}>
                    {formatPKR(netPayout)}
                  </span>
                </div>
                
                {/* Additional Info */}
                <div style={{ fontSize: '0.65rem', marginTop: '6px', opacity: 0.6, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Staff Count: <b>{employeeCount}</b></span>
                  {advancesDeducted > 0 && (
                    <span>Advances: <b>{advanceCount}</b></span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!isReadOnly && record.status === 'DRAFT' && (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={() => handleStatus(record.id, 'approve')} 
                      className="btn btn-primary" 
                      style={{ flex: 1, height: '30px', fontSize: '0.75rem', padding: 0 }}
                    >
                      Authorize
                    </button>
                    <button 
                      onClick={() => handleStatus(record.id, 'reject')} 
                      className="btn btn-soft" 
                      style={{ flex: 1, height: '30px', fontSize: '0.75rem', padding: 0, color: '#ef4444' }}
                    >
                      Reject
                    </button>
                  </div>
                )}
                
                {!isReadOnly && record.status === 'APPROVED' && (
                  <button 
                    onClick={() => handleStatus(record.id, 'mark_as_paid')} 
                    className="btn btn-primary" 
                    style={{ height: '30px', fontSize: '0.75rem', padding: 0, background: '#10b981' }}
                  >
                    💰 Disburse Cash
                  </button>
                )}
                
                <button 
                  onClick={() => navigate(`/payroll-slips/${record.id}`)} 
                  className="btn btn-soft" 
                  style={{ height: '30px', fontSize: '0.75rem', padding: 0 }}
                >
                  👁️ View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredRecords.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No payroll records found for the selected filters.</p>
          {!isReadOnly && (
            <button onClick={generateDraft} className="btn btn-primary" style={{ marginTop: '12px' }}>
              Generate First Draft
            </button>
          )}
        </div>
      )}
    </div>
  );
}