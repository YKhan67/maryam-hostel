// src/pages/BIPage.js
import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import { saveAs } from "file-saver";

export default function BIPage() {
  const { user } = useContext(AuthContext);
  const [reportTypes, setReportTypes] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    hostel_id: '',
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hostels, setHostels] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('chart');

  const isManager = user?.role === "HOSTEL_MANAGER" || user?.role === "SUPER_ADMIN" || user?.role === "CITY_MANAGER";

  useEffect(() => {
    loadReportTypes();
    loadHostels();
  }, []);

  async function loadReportTypes() {
    try {
      const res = await api.get("bi/reports/types/");
      setReportTypes(res.data || []);
    } catch (err) {
      console.error("Error loading report types:", err);
    }
  }

  async function loadHostels() {
    try {
      const res = await api.get("hostels/");
      setHostels(res.data.results || res.data || []);
    } catch (err) {
      console.error("Error loading hostels:", err);
    }
  }

  async function generateReport() {
    if (!selectedReport) {
      alert("Please select a report type.");
      return;
    }

    setLoading(true);
    setReportData(null);

    try {
      const response = await api.post("bi/reports/generate/", {
        report_type: selectedReport.id,
        filters: filters,
      });
      setReportData(response.data);
    } catch (err) {
      console.error("Error generating report:", err);
      alert("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function exportReport() {
    if (!reportData) {
      alert("Please generate a report first.");
      return;
    }

    setExporting(true);
    try {
      const response = await api.post("bi/reports/export/", {
        report_type: selectedReport.id,
        filters: filters,
        report_data: reportData,
      }, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `${selectedReport.id}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("Error exporting report:", err);
      alert("Failed to export report.");
    } finally {
      setExporting(false);
    }
  }

  const renderSummaryCards = (summary) => {
    if (!summary) return null;

    const cards = Object.entries(summary).map(([key, value]) => {
      let displayValue = value;
      if (typeof value === 'number') {
        displayValue = value.toLocaleString();
      }
      if (key.includes('rate') || key.includes('percentage')) {
        displayValue = `${Number(value).toFixed(1)}%`;
      }
      if (key.includes('revenue') || key.includes('cost') || key.includes('salary') || key.includes('deposit')) {
        displayValue = `Rs ${Number(value).toLocaleString()}`;
      }

      const label = key.replace(/_/g, ' ').toUpperCase();
      return (
        <div key={key} className="card" style={{ padding: '16px', textAlign: 'center', flex: '1', minWidth: '150px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>
            {label}
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--brand-gold)' }}>
            {displayValue}
          </div>
        </div>
      );
    });

    return (
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {cards}
      </div>
    );
  };

  const renderTableData = (data, title) => {
    if (!data || data.length === 0) return null;

    const headers = Object.keys(data[0]);

    return (
      <div className="card" style={{ padding: 0, marginBottom: '24px' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>
          {title || 'Data'}
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                {headers.map(h => (
                  <th key={h}>{h.replace(/_/g, ' ').toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  {headers.map(h => (
                    <td key={h}>
                      {typeof row[h] === 'number' ? (h.includes('rate') || h.includes('percentage') ? `${Number(row[h]).toFixed(1)}%` : Number(row[h]).toLocaleString()) : row[h] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderChart = (data) => {
    if (!data) return null;

    // Simple chart rendering using CSS (can be replaced with Chart.js)
    const chartData = data.monthly_data || data.hostel_data || data.top_items || data.vendor_data;

    if (!chartData || chartData.length === 0) return null;

    const maxValue = Math.max(...chartData.map(d => {
      const values = Object.values(d).filter(v => typeof v === 'number');
      return Math.max(...values);
    }));

    return (
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h4 style={{ marginBottom: '16px' }}>Chart View</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {chartData.slice(0, 10).map((item, idx) => {
            const label = item.month || item.hostel_name || item.name || item.item__name || 'Item';
            const value = item.revenue || item.collected || item.total_cost || item.avg_rating || 0;
            const percentage = maxValue > 0 ? (value / maxValue * 100) : 0;

            return (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 700 }}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: `hsl(${idx * 30 % 360}, 70%, 50%)`,
                    borderRadius: '4px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isReportAvailable = user && (user.role === 'SUPER_ADMIN' || user.role === 'CITY_MANAGER' || user.role === 'PARTNER' || user.role === 'HOSTEL_MANAGER' || user.role === 'STAFF');

  if (!isReportAvailable) {
    return (
      <div className="page management-page">
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔒</div>
          <h3>Access Denied</h3>
          <p style={{ color: 'var(--text-muted)' }}>You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page management-page">
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0 }}>📊 Business Intelligence</h2>
            <p className="card-subtext">Generate and analyze reports across all modules</p>
          </div>
          {user?.role === 'SUPER_ADMIN' && (
            <span className="badge badge-success">👑 Full Access</span>
          )}
        </div>
      </div>

      {/* Report Selection */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {reportTypes.map(report => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className={`btn ${selectedReport?.id === report.id ? 'btn-primary' : 'btn-soft'}`}
              style={{ padding: '12px', textAlign: 'left', justifyContent: 'flex-start' }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{report.name}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{report.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {selectedReport && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>Filters</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Hostel</label>
              <select
                className="form-input"
                value={filters.hostel_id}
                onChange={(e) => setFilters({ ...filters, hostel_id: e.target.value })}
              >
                <option value="">All Hostels</option>
                {hostels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <button onClick={generateReport} className="btn btn-primary" disabled={loading}>
                {loading ? 'Generating...' : '📊 Generate Report'}
              </button>
              {reportData && (
                <button onClick={exportReport} className="btn btn-success" disabled={exporting}>
                  {exporting ? 'Exporting...' : '📥 Export Excel'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Output */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <p>Generating report...</p>
        </div>
      )}

      {reportData && !loading && (
        <>
          {/* Summary Cards */}
          {reportData.summary && renderSummaryCards(reportData.summary)}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <button
              onClick={() => setActiveTab('chart')}
              className={`btn ${activeTab === 'chart' ? 'btn-primary' : 'btn-soft'}`}
              style={{ fontSize: '0.8rem', padding: '4px 16px' }}
            >
              📊 Chart
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`btn ${activeTab === 'table' ? 'btn-primary' : 'btn-soft'}`}
              style={{ fontSize: '0.8rem', padding: '4px 16px' }}
            >
              📋 Table
            </button>
          </div>

          {/* Chart View */}
          {activeTab === 'chart' && (
            <>
              {renderChart(reportData)}
              {!reportData.monthly_data && !reportData.hostel_data && !reportData.top_items && !reportData.vendor_data && (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No chart data available for this report.</p>
                </div>
              )}
            </>
          )}

          {/* Table View */}
          {activeTab === 'table' && (
            <>
              {reportData.monthly_data && renderTableData(reportData.monthly_data, 'Monthly Data')}
              {reportData.hostel_data && renderTableData(reportData.hostel_data, 'Hostel Data')}
              {reportData.top_items && renderTableData(reportData.top_items, 'Top Items')}
              {reportData.vendor_data && renderTableData(reportData.vendor_data, 'Vendor Data')}
              {reportData.status_breakdown && renderTableData(reportData.status_breakdown, 'Status Breakdown')}
              {reportData.rating_distribution && renderTableData(
                Object.entries(reportData.rating_distribution).map(([key, value]) => ({ rating: key, count: value })),
                'Rating Distribution'
              )}
              {!reportData.monthly_data && !reportData.hostel_data && !reportData.top_items && !reportData.vendor_data && !reportData.status_breakdown && (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No table data available for this report.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}