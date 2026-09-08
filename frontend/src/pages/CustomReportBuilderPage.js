// src/pages/CustomReportBuilderPage.js
import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } from "docx";

export default function CustomReportBuilderPage() {
  const { user } = useContext(AuthContext);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [filters, setFilters] = useState([]);
  const [groupBy, setGroupBy] = useState([]);
  const [sortBy, setSortBy] = useState([]);
  const [dateRange, setDateRange] = useState({ field: '', start: '', end: '' });
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [savedReports, setSavedReports] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [isShared, setIsShared] = useState(false);
  const [sharedRoles, setSharedRoles] = useState([]);
  const [distinctOnly, setDistinctOnly] = useState(false);

  const isManager = user?.role === "HOSTEL_MANAGER" || user?.role === "SUPER_ADMIN" || user?.role === "CITY_MANAGER";

  useEffect(() => {
    loadTables();
    loadSavedReports();
  }, []);

  async function loadTables() {
    setLoading(true);
    try {
      const res = await api.get("bi/custom-reports/tables/");
      setTables(res.data || []);
      console.log("Tables loaded:", res.data);
    } catch (err) {
      console.error("Error loading tables:", err);
      alert("Failed to load tables. Please check the console for errors.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSavedReports() {
    try {
      const res = await api.get("bi/custom-reports/");
      setSavedReports(res.data || []);
    } catch (err) {
      console.error("Error loading saved reports:", err);
    }
  }

  // Get all fields from selected tables
  const getAllAvailableFields = () => {
    const allFields = [];
    selectedTables.forEach(tableName => {
      const table = tables.find(t => t.table === tableName);
      if (table && table.fields) {
        table.fields.forEach(field => {
          allFields.push({
            ...field,
            table: tableName,
            tableLabel: table.label
          });
        });
      }
    });
    return allFields;
  };

  // Get fields for a specific table
  const getFieldsForTable = (tableName) => {
    const table = tables.find(t => t.table === tableName);
    return table ? table.fields || [] : [];
  };

  const toggleTable = (table) => {
    if (selectedTables.includes(table)) {
      setSelectedTables(selectedTables.filter(t => t !== table));
      setSelectedFields(selectedFields.filter(f => f.table !== table));
    } else {
      setSelectedTables([...selectedTables, table]);
    }
  };

  const toggleField = (field) => {
    if (selectedFields.find(f => f.name === field.name && f.table === selectedTable.table)) {
      setSelectedFields(selectedFields.filter(f => !(f.name === field.name && f.table === selectedTable.table)));
    } else {
      setSelectedFields([...selectedFields, { ...field, table: selectedTable.table }]);
    }
  };

  // Toggle all fields of a table
  const toggleAllFields = (tableName) => {
    const table = tables.find(t => t.table === tableName);
    if (!table) return;
    
    const allFieldsInTable = table.fields.map(f => ({ ...f, table: tableName }));
    const allSelected = allFieldsInTable.every(f => 
      selectedFields.some(sf => sf.name === f.name && sf.table === tableName)
    );
    
    if (allSelected) {
      setSelectedFields(selectedFields.filter(f => f.table !== tableName));
    } else {
      const existingFields = selectedFields.filter(f => f.table !== tableName);
      setSelectedFields([...existingFields, ...allFieldsInTable]);
    }
  };

  const addFilter = () => {
    const availableFields = getAllAvailableFields();
    const defaultField = availableFields.length > 0 ? availableFields[0] : null;
    setFilters([...filters, { 
      table: defaultField?.table || (selectedTables.length > 0 ? selectedTables[0] : ''), 
      field: defaultField?.name || '', 
      operator: 'eq', 
      value: '',
      case_sensitive: false
    }]);
  };

  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index, key, value) => {
    const updated = [...filters];
    updated[index][key] = value;
    if (key === 'table') {
      const fields = getFieldsForTable(value);
      updated[index].field = fields.length > 0 ? fields[0].name : '';
    }
    setFilters(updated);
  };

  const addSort = () => {
    const availableFields = getAllAvailableFields();
    const defaultField = availableFields.length > 0 ? availableFields[0] : null;
    setSortBy([...sortBy, { 
      table: defaultField?.table || (selectedTables.length > 0 ? selectedTables[0] : ''), 
      field: defaultField?.name || '', 
      direction: 'asc' 
    }]);
  };

  const removeSort = (index) => {
    setSortBy(sortBy.filter((_, i) => i !== index));
  };

  const updateSort = (index, key, value) => {
    const updated = [...sortBy];
    updated[index][key] = value;
    if (key === 'table') {
      const fields = getFieldsForTable(value);
      updated[index].field = fields.length > 0 ? fields[0].name : '';
    }
    setSortBy(updated);
  };

  const addGroupBy = () => {
    const availableFields = getAllAvailableFields();
    const defaultField = availableFields.length > 0 ? availableFields[0] : null;
    setGroupBy([...groupBy, { 
      table: defaultField?.table || (selectedTables.length > 0 ? selectedTables[0] : ''), 
      field: defaultField?.name || '' 
    }]);
  };

  const removeGroupBy = (index) => {
    setGroupBy(groupBy.filter((_, i) => i !== index));
  };

  const updateGroupBy = (index, key, value) => {
    const updated = [...groupBy];
    updated[index][key] = value;
    if (key === 'table') {
      const fields = getFieldsForTable(value);
      updated[index].field = fields.length > 0 ? fields[0].name : '';
    }
    setGroupBy(updated);
  };

  const runReport = async () => {
    if (selectedFields.length === 0) {
      alert("Please select at least one field.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("bi/custom-reports/generate/", {
        tables: selectedTables,
        fields: selectedFields,
        filters: filters.filter(f => f.field && f.value),
        group_by: groupBy.filter(g => g.field),
        sort_by: sortBy.filter(s => s.field),
        date_range: dateRange,
        distinct: distinctOnly,
      });
      
      console.log("Report response:", response.data);
      
      let resultsData = response.data.results || [];
      if (typeof resultsData === 'object' && !Array.isArray(resultsData)) {
        resultsData = [resultsData];
      }
      
      console.log("Results data:", resultsData);
      setResults(resultsData);
    } catch (err) {
      console.error("Error generating report:", err);
      alert("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save new report using the correct endpoint
  const saveReport = async () => {
    if (!reportName) {
      alert("Please enter a report name.");
      return;
    }

    const payload = {
      name: reportName,
      description: reportDescription,
      tables: selectedTables,
      fields: selectedFields,
      filters: filters.filter(f => f.field && f.value),
      group_by: groupBy.filter(g => g.field),
      sort_by: sortBy.filter(s => s.field),
      date_range: dateRange,
      is_shared: isShared,
      shared_with_roles: sharedRoles,
      distinct: distinctOnly,
    };

    try {
      // Use the custom save_report endpoint
      const res = await api.post("bi/custom-reports/save_report/", payload);
      alert("✅ Report saved successfully!");
      setShowSaveModal(false);
      loadSavedReports(); // reload list
      // Optionally load the saved report configuration
      if (res.data) {
        loadSavedReport(res.data);
      }
    } catch (err) {
      console.error("Error saving report:", err);
      alert("Failed to save report. Please check the console.");
    }
  };

  // Update existing report using the correct endpoint
  const updateReport = async () => {
    if (!reportName) {
      alert("Please enter a report name.");
      return;
    }

    const payload = {
      id: editingReport.id,   // include id for update
      name: reportName,
      description: reportDescription,
      tables: selectedTables,
      fields: selectedFields,
      filters: filters.filter(f => f.field && f.value),
      group_by: groupBy.filter(g => g.field),
      sort_by: sortBy.filter(s => s.field),
      date_range: dateRange,
      is_shared: isShared,
      shared_with_roles: sharedRoles,
      distinct: distinctOnly,
    };

    try {
      await api.post("bi/custom-reports/save_report/", payload);
      alert("✅ Report updated successfully!");
      setShowEditModal(false);
      setEditingReport(null);
      loadSavedReports();
    } catch (err) {
      console.error("Error updating report:", err);
      alert("Failed to update report.");
    }
  };

  // Delete report
  const deleteReport = async (reportId, reportName) => {
    if (!window.confirm(`Are you sure you want to delete "${reportName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`bi/custom-reports/${reportId}/`);
      alert("✅ Report deleted successfully!");
      loadSavedReports();
    } catch (err) {
      console.error("Error deleting report:", err);
      alert("Failed to delete report.");
    }
  };

  // Load saved report for editing
  const loadSavedReport = (report) => {
    setReportName(report.name);
    setReportDescription(report.description || '');
    setSelectedTables(report.tables || []);
    setSelectedFields(report.fields || []);
    setFilters(report.filters || []);
    setGroupBy(report.group_by || []);
    setSortBy(report.sort_by || []);
    setDateRange(report.date_range || { field: '', start: '', end: '' });
    setIsShared(report.is_shared || false);
    setSharedRoles(report.shared_with_roles || []);
    setDistinctOnly(report.distinct || false);
  };

  // Load report for editing
  const handleEditReport = (report) => {
    setEditingReport(report);
    loadSavedReport(report);
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setReportName('');
    setReportDescription('');
    setSelectedTables([]);
    setSelectedFields([]);
    setFilters([]);
    setGroupBy([]);
    setSortBy([]);
    setDateRange({ field: '', start: '', end: '' });
    setIsShared(false);
    setSharedRoles([]);
    setDistinctOnly(false);
    setEditingReport(null);
    setResults([]);
  };

  const exportToCSV = () => {
    if (results.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = Object.keys(results[0]);
    const csv = [
      headers.join(','),
      // `row[h] || ''` turned any falsy-but-real value (0, false, '') into an
      // empty cell — a row with a numeric 0 or a boolean false was exported
      // as blank instead of "0"/"false". Only substitute for null/undefined.
      ...results.map(row => headers.map(h => {
        const v = row[h];
        return JSON.stringify(v === null || v === undefined ? '' : v);
      }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName || 'custom_report'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (results.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = Object.keys(results[0]);
    // Landscape avoids over-cramming wide reports; portrait is nicer for
    // narrow ones. Purely a readability call, not a hard rule.
    const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' });

    doc.setFontSize(14);
    doc.text(reportName || 'Custom Report', 14, 15);
    let startY = 20;
    if (reportDescription) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(reportDescription, 14, 21);
      startY = 26;
    }

    autoTable(doc, {
      startY,
      head: [headers.map(h => h.replace(/_/g, ' ').toUpperCase())],
      body: results.map(row => headers.map(h => {
        const v = row[h];
        return v === null || v === undefined ? '—' : String(v);
      })),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`${reportName || 'custom_report'}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToWord = async () => {
    if (results.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = Object.keys(results[0]);

    const headerRow = new TableRow({
      children: headers.map(h => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: h.replace(/_/g, ' ').toUpperCase(), bold: true })],
        })],
      })),
    });

    const dataRows = results.map(row => new TableRow({
      children: headers.map(h => {
        const v = row[h];
        const text = v === null || v === undefined ? '—' : String(v);
        return new TableCell({ children: [new Paragraph(text)] });
      }),
    }));

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: reportName || 'Custom Report', heading: HeadingLevel.HEADING_1 }),
          ...(reportDescription ? [new Paragraph(reportDescription)] : []),
          new Paragraph({ text: `${results.length} rows`, spacing: { after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${reportName || 'custom_report'}_${new Date().toISOString().split('T')[0]}.docx`);
  };

  if (!isManager) {
    return (
      <div className="page management-page">
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔒</div>
          <h3>Access Denied</h3>
          <p style={{ color: 'var(--text-muted)' }}>You don't have permission to use the report builder.</p>
        </div>
      </div>
    );
  }

  // Get available fields for dropdowns
  const availableFields = getAllAvailableFields();

  // Group selected fields by table for display
  const groupedSelectedFields = {};
  selectedFields.forEach(field => {
    if (!groupedSelectedFields[field.table]) {
      groupedSelectedFields[field.table] = [];
    }
    groupedSelectedFields[field.table].push(field);
  });

  return (
    <div className="page management-page">
      {/* Header */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0 }}>🔧 Custom Report Builder</h2>
            <p className="card-subtext">Create your own tailored reports by selecting tables and fields</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* This used to call resetForm() before opening the modal, which
                wiped out the tables/fields/filters the user had just built —
                saveReport() reads that same state, so the save would go
                through with everything empty. Just open the modal. */}
            <button onClick={() => setShowSaveModal(true)} className="btn btn-primary">
              💾 Save Report
            </button>
            <button onClick={runReport} className="btn btn-success" disabled={selectedFields.length === 0 || loading}>
              {loading ? 'Running...' : '▶️ Run Report'}
            </button>
            {results.length > 0 && (
              <>
                <button onClick={exportToCSV} className="btn btn-soft">
                  📥 Export CSV
                </button>
                <button onClick={exportToPDF} className="btn btn-soft">
                  📄 Export PDF
                </button>
                <button onClick={exportToWord} className="btn btn-soft">
                  📝 Export Word
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Left Panel - Builder */}
        <div>
          {/* Table Selection */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '12px' }}>📋 Tables ({tables.length})</h4>
            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading tables...</p>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {tables.length === 0 ? (
                  <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>No tables found. Please check the server.</p>
                ) : (
                  tables.map(table => (
                    <div
                      key={table.table}
                      onClick={() => setSelectedTable(table)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        background: selectedTable?.table === table.table ? '#e2e8f0' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTables.includes(table.table)}
                        onChange={() => toggleTable(table.table)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>{table.label}</span>
                      <span style={{ fontSize: '0.6rem', opacity: 0.5, marginLeft: 'auto' }}>
                        {table.fields?.length || 0} fields
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Field Selection */}
          {selectedTable && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0 }}>📊 Fields ({selectedTable.label})</h4>
                <button 
                  onClick={() => toggleAllFields(selectedTable.table)} 
                  className="btn btn-soft" 
                  style={{ padding: '2px 8px', fontSize: '0.6rem' }}
                >
                  {selectedTable.fields?.every(f => selectedFields.some(sf => sf.name === f.name && sf.table === selectedTable.table)) 
                    ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {selectedTable.fields?.map(field => (
                  <div
                    key={field.name}
                    style={{
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedFields.find(f => f.name === field.name && f.table === selectedTable.table)}
                      onChange={() => toggleField(field)}
                    />
                    <span style={{ fontSize: '0.85rem' }}>{field.label}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.5, marginLeft: 'auto' }}>{field.type}</span>
                  </div>
                ))}
                {!selectedTable.fields?.length && (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                    No fields available
                  </div>
                )}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Selected: {selectedFields.filter(f => f.table === selectedTable.table).length} of {selectedTable.fields?.length || 0} fields
              </div>
            </div>
          )}

          {/* Selected Fields Summary */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0 }}>✅ Selected Fields ({selectedFields.length})</h4>
              <button 
                onClick={() => setSelectedFields([])} 
                className="btn btn-soft" 
                style={{ padding: '2px 8px', fontSize: '0.6rem', color: '#dc2626' }}
              >
                Clear All
              </button>
            </div>
            <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem' }}>
              {Object.keys(groupedSelectedFields).map(tableName => {
                const table = tables.find(t => t.table === tableName);
                return (
                  <div key={tableName} style={{ marginBottom: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.7rem', color: 'var(--brand-gold)' }}>
                      {table?.label || tableName}
                    </div>
                    {groupedSelectedFields[tableName].map((field, idx) => (
                      <div key={idx} style={{ padding: '2px 8px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{field.label}</span>
                        <span style={{ opacity: 0.4, fontSize: '0.6rem' }}>{field.type}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {selectedFields.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No fields selected</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Filters and Results */}
        <div>
          {/* Distinct Option */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={distinctOnly}
                  onChange={(e) => setDistinctOnly(e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>Show only unique records (DISTINCT)</span>
              </label>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Removes duplicate rows from results
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0 }}>🔍 Filters</h4>
              <button onClick={addFilter} className="btn btn-soft" style={{ padding: '4px 12px', fontSize: '0.7rem' }}>
                + Add Filter
              </button>
            </div>
            {filters.map((filter, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <select
                  className="form-input"
                  style={{ fontSize: '0.8rem' }}
                  value={filter.table}
                  onChange={(e) => updateFilter(index, 'table', e.target.value)}
                >
                  <option value="">Select Table</option>
                  {selectedTables.map(t => {
                    const table = tables.find(tbl => tbl.table === t);
                    return <option key={t} value={t}>{table?.label || t}</option>;
                  })}
                </select>
                <select
                  className="form-input"
                  style={{ fontSize: '0.8rem' }}
                  value={filter.field}
                  onChange={(e) => updateFilter(index, 'field', e.target.value)}
                >
                  <option value="">Select Field</option>
                  {getFieldsForTable(filter.table).map(field => (
                    <option key={field.name} value={field.name}>{field.label}</option>
                  ))}
                </select>
                <select
                  className="form-input"
                  style={{ fontSize: '0.8rem' }}
                  value={filter.operator}
                  onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                >
                  <option value="eq">=</option>
                  <option value="contains">Contains</option>
                  <option value="gt">&gt;</option>
                  <option value="lt">&lt;</option>
                  <option value="gte">&gt;=</option>
                  <option value="lte">&lt;=</option>
                </select>
                <input
                  className="form-input"
                  style={{ fontSize: '0.8rem' }}
                  placeholder="Value"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, 'value', e.target.value)}
                />
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={filter.case_sensitive || false}
                    onChange={(e) => {
                      const updated = [...filters];
                      updated[index].case_sensitive = e.target.checked;
                      setFilters(updated);
                    }}
                    style={{ marginRight: '4px' }}
                  />
                  Exact Case
                </label>
                <button onClick={() => removeFilter(index)} className="btn btn-soft" style={{ padding: '4px 8px', color: '#dc2626' }}>✕</button>
              </div>
            ))}
            {filters.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>No filters added</div>
            )}
          </div>

          {/* Date Range */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '12px' }}>📅 Date Range</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <select
                className="form-input"
                value={dateRange.field}
                onChange={(e) => setDateRange({ ...dateRange, field: e.target.value })}
              >
                <option value="">Select Date Field</option>
                {availableFields.filter(f => f.type === 'date' || f.type === 'datetime' || f.type === 'datetimefield' || f.type === 'datefield').map(field => (
                  <option key={`${field.table}.${field.name}`} value={field.name}>
                    {field.tableLabel || field.table} - {field.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="form-input"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <input
                type="date"
                className="form-input"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>

          {/* Sorting & Grouping */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0 }}>📊 Sort By</h4>
                <button onClick={addSort} className="btn btn-soft" style={{ padding: '4px 12px', fontSize: '0.7rem' }}>
                  + Add
                </button>
              </div>
              {sortBy.map((sort, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                  <select
                    className="form-input"
                    style={{ fontSize: '0.8rem' }}
                    value={sort.table}
                    onChange={(e) => updateSort(index, 'table', e.target.value)}
                  >
                    <option value="">Select Table</option>
                    {selectedTables.map(t => {
                      const table = tables.find(tbl => tbl.table === t);
                      return <option key={t} value={t}>{table?.label || t}</option>;
                    })}
                  </select>
                  <select
                    className="form-input"
                    style={{ fontSize: '0.8rem' }}
                    value={sort.field}
                    onChange={(e) => updateSort(index, 'field', e.target.value)}
                  >
                    <option value="">Select Field</option>
                    {getFieldsForTable(sort.table).map(field => (
                      <option key={field.name} value={field.name}>{field.label}</option>
                    ))}
                  </select>
                  <button onClick={() => removeSort(index)} className="btn btn-soft" style={{ padding: '4px 8px', color: '#dc2626' }}>✕</button>
                </div>
              ))}
              {sortBy.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.8rem' }}>No sort criteria</div>
              )}
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0 }}>📋 Group By</h4>
                <button onClick={addGroupBy} className="btn btn-soft" style={{ padding: '4px 12px', fontSize: '0.7rem' }}>
                  + Add
                </button>
              </div>
              {groupBy.map((group, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <select
                      className="form-input"
                      style={{ fontSize: '0.8rem' }}
                      value={group.table}
                      onChange={(e) => updateGroupBy(index, 'table', e.target.value)}
                    >
                      <option value="">Select Table</option>
                      {selectedTables.map(t => {
                        const table = tables.find(tbl => tbl.table === t);
                        return <option key={t} value={t}>{table?.label || t}</option>;
                      })}
                    </select>
                    <select
                      className="form-input"
                      style={{ fontSize: '0.8rem' }}
                      value={group.field}
                      onChange={(e) => updateGroupBy(index, 'field', e.target.value)}
                    >
                      <option value="">Select Field</option>
                      {getFieldsForTable(group.table).map(field => (
                        <option key={field.name} value={field.name}>{field.label}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => removeGroupBy(index)} className="btn btn-soft" style={{ padding: '4px 8px', color: '#dc2626' }}>✕</button>
                </div>
              ))}
              {groupBy.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.8rem' }}>No group criteria</div>
              )}
            </div>
          </div>

          {/* Saved Reports */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0 }}>💾 Saved Reports</h4>
              <button 
                onClick={() => { resetForm(); setShowSaveModal(true); }} 
                className="btn btn-primary" 
                style={{ padding: '2px 12px', fontSize: '0.7rem' }}
              >
                + New
              </button>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {savedReports.length > 0 ? (
                savedReports.map(report => (
                  <div
                    key={report.id}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div 
                      style={{ cursor: 'pointer', flex: 1 }}
                      onClick={() => loadSavedReport(report)}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{report.name}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{report.description || 'No description'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button 
                        onClick={() => handleEditReport(report)} 
                        className="btn btn-soft" 
                        style={{ padding: '2px 8px', fontSize: '0.6rem' }}
                        title="Edit Report"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => deleteReport(report.id, report.name)} 
                        className="btn btn-soft" 
                        style={{ padding: '2px 8px', fontSize: '0.6rem', color: '#dc2626' }}
                        title="Delete Report"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                  No saved reports yet. Create your first report!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && Object.keys(results[0]).length > 0 && (
        <div className="card" style={{ marginTop: '24px', padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>📊 Results ({results.length} rows {distinctOnly ? '(DISTINCT)' : ''})</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={exportToCSV} className="btn btn-soft" style={{ fontSize: '0.7rem', padding: '4px 12px' }}>
                📥 Export CSV
              </button>
              <button onClick={exportToPDF} className="btn btn-soft" style={{ fontSize: '0.7rem', padding: '4px 12px' }}>
                📄 Export PDF
              </button>
              <button onClick={exportToWord} className="btn btn-soft" style={{ fontSize: '0.7rem', padding: '4px 12px' }}>
                📝 Export Word
              </button>
            </div>
          </div>
          <div className="table-wrapper" style={{ maxHeight: '500px', overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  {Object.keys(results[0]).map(key => (
                    <th key={key}>{key.replace(/_/g, ' ').toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((value, colIdx) => (
                      <td key={colIdx}>
                        {value !== null && value !== undefined ? 
                          (typeof value === 'number' ? value.toLocaleString() : String(value)) : 
                          '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results.length > 0 && Object.keys(results[0]).length === 0 && (
        <div className="card" style={{ marginTop: '24px', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No data to display. Please check your report configuration.</p>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '32px' }}>
            <h3 style={{ marginBottom: '16px' }}>💾 Save Custom Report</h3>
            <form onSubmit={(e) => { e.preventDefault(); saveReport(); }}>
              <div className="form-group">
                <label className="form-label">Report Name *</label>
                <input
                  className="form-input"
                  required
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="My Custom Report"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="What does this report show?"
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                  />
                  Share with others
                </label>
              </div>
              {isShared && (
                <div className="form-group">
                  <label className="form-label">Share with Roles</label>
                  <select
                    className="form-input"
                    multiple
                    value={sharedRoles}
                    onChange={(e) => setSharedRoles(Array.from(e.target.selectedOptions, option => option.value))}
                  >
                    <option value="HOSTEL_MANAGER">Hostel Manager</option>
                    <option value="CITY_MANAGER">City Manager</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="PARTNER">Partner</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Report
                </button>
                <button type="button" onClick={() => { setShowSaveModal(false); resetForm(); }} className="btn btn-soft" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingReport && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '32px' }}>
            <h3 style={{ marginBottom: '16px' }}>✏️ Edit Custom Report</h3>
            <form onSubmit={(e) => { e.preventDefault(); updateReport(); }}>
              <div className="form-group">
                <label className="form-label">Report Name *</label>
                <input
                  className="form-input"
                  required
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="My Custom Report"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="What does this report show?"
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                  />
                  Share with others
                </label>
              </div>
              {isShared && (
                <div className="form-group">
                  <label className="form-label">Share with Roles</label>
                  <select
                    className="form-input"
                    multiple
                    value={sharedRoles}
                    onChange={(e) => setSharedRoles(Array.from(e.target.selectedOptions, option => option.value))}
                  >
                    <option value="HOSTEL_MANAGER">Hostel Manager</option>
                    <option value="CITY_MANAGER">City Manager</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="PARTNER">Partner</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Update Report
                </button>
                <button type="button" onClick={() => { setShowEditModal(false); setEditingReport(null); resetForm(); }} className="btn btn-soft" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}