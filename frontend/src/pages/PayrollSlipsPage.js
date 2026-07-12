// src/pages/PayrollSlipsPage.js
import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../AuthContext";
import { formatPKR } from "../utils/formatPKR";

export default function PayrollSlipsPage() {
  const { recordId } = useParams();
  const { user } = useContext(AuthContext);
  const isReadOnly = user?.role === 'PARTNER';

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSlips();
  }, [recordId]);

  async function loadSlips() {
    setLoading(true);
    try {
      const res = await api.get(`payroll/records/${recordId}/`);
      setRecord(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const downloadPDF = async (slipId) => {
    try {
      const response = await api.get(`payroll/slips/${slipId}/download_pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PaySlip_${slipId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download PDF.");
    }
  };

  if (loading) return <p>Loading Pay-slips...</p>;
  if (!record) return <p>Record not found.</p>;

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: '24px' }}>Individual Employee Pay-slips</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Designation</th>
                <th>Base + Allw</th>
                <th>Tasks</th>
                <th>Advances</th>
                <th>Net Payable</th>
                {!isReadOnly && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {record.slips.map(slip => (
                <tr key={slip.id}>
                  <td><b>{slip.employee_name}</b></td>
                  <td>{slip.designation}</td>
                  <td>{formatPKR(parseFloat(slip.base_pay) + parseFloat(slip.allowances))}</td>
                  <td>{slip.task_count} ({formatPKR(slip.task_pay)})</td>
                  <td style={{ color: 'var(--danger)' }}>-{formatPKR(slip.advance_deduction)}</td>
                  <td style={{ fontWeight: 800 }}>{formatPKR(slip.net_salary)}</td>
                  {!isReadOnly && (
                    <td>
                      <button onClick={() => downloadPDF(slip.id)} className="btn btn-soft" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>
                        📄 Download PDF
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
