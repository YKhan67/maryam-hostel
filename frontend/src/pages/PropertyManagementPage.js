import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

function listData(response) {
  return response.data?.results || response.data || [];
}

export default function PropertyManagementPage() {
  const [properties, setProperties] = useState([]);
  const [beds, setBeds] = useState([]);
  const [students, setStudents] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedBed, setSelectedBed] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [propertyResponse, bedResponse, studentResponse, allocationResponse] = await Promise.all([
        api.get("properties/"),
        api.get("beds/"),
        api.get("students/"),
        api.get("bed-allocations/"),
      ]);
      setProperties(listData(propertyResponse));
      setBeds(listData(bedResponse));
      setStudents(listData(studentResponse));
      setAllocations(listData(allocationResponse));
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to load property and allocation data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const assignedBedIds = useMemo(
    () => new Set(students.filter((student) => student.bed).map((student) => String(student.bed))),
    [students]
  );

  async function assignBed(event) {
    event.preventDefault();
    if (!selectedStudent || !selectedBed) return;
    try {
      const student = students.find((item) => String(item.id) === String(selectedStudent));
      const action = student?.bed ? "transfer-bed" : "allocate-bed";
      await api.post(`students/${selectedStudent}/${action}/`, {
        bed_id: selectedBed,
        reason,
      });
      setMessage("Bed allocation saved.");
      setReason("");
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.detail || "Bed allocation failed.");
    }
  }

  async function releaseBed(studentId) {
    try {
      await api.post(`students/${studentId}/release-bed/`, { reason: "Student released bed" });
      setMessage("Bed released.");
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.detail || "Bed release failed.");
    }
  }

  if (loading) return <div className="page management-page"><p>Loading property operations...</p></div>;

  return (
    <div className="page management-page">
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Property and Bed Operations</h2>
        <p className="card-subtext">Properties remain under their hostel; occupancy is derived from student assignments.</p>
        {message && <p style={{ color: "var(--brand-gold)" }}>{message}</p>}
      </div>

      <div className="cards-row" style={{ marginBottom: 24 }}>
        <div className="card kpi-card"><div className="card-title">Properties</div><div className="card-value">{properties.length}</div></div>
        <div className="card kpi-card"><div className="card-title">Beds</div><div className="card-value">{beds.length}</div></div>
        <div className="card kpi-card"><div className="card-title">Assigned Beds</div><div className="card-value">{assignedBedIds.size}</div></div>
        <div className="card kpi-card"><div className="card-title">Students Without Beds</div><div className="card-value">{students.filter((student) => !student.bed && student.is_active).length}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Allocate or transfer a bed</h3>
        <form onSubmit={assignBed} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <label className="form-group">Student
            <select className="form-input" value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)} required>
              <option value="">Select student</option>
              {students.filter((student) => student.is_active).map((student) => (
                <option key={student.id} value={student.id}>{student.user?.username || `Student ${student.id}`}</option>
              ))}
            </select>
          </label>
          <label className="form-group">Bed
            <select className="form-input" value={selectedBed} onChange={(event) => setSelectedBed(event.target.value)} required>
              <option value="">Select available bed</option>
              {beds.filter((bed) => !assignedBedIds.has(String(bed.id))).map((bed) => (
                <option key={bed.id} value={bed.id}>Bed {bed.label} (Room {bed.room || bed.room_number || bed.id})</option>
              ))}
            </select>
          </label>
          <label className="form-group">Reason
            <input className="form-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Initial allocation or transfer" />
          </label>
          <button className="btn btn-primary" type="submit">Save allocation</button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Properties</h3>
        <div className="table-wrapper"><table className="table"><thead><tr><th>Name</th><th>Hostel</th><th>Type</th><th>Status</th></tr></thead><tbody>
          {properties.map((property) => <tr key={property.id}><td>{property.name}</td><td>{property.hostel_name || property.hostel}</td><td>{property.property_type}</td><td>{property.is_active ? "Active" : "Inactive"}</td></tr>)}
        </tbody></table></div>
      </div>

      <div className="card">
        <h3>Allocation history</h3>
        <div className="table-wrapper"><table className="table"><thead><tr><th>Student</th><th>Room</th><th>Bed</th><th>Move in</th><th>Move out</th><th>Status</th><th /></tr></thead><tbody>
          {allocations.map((allocation) => <tr key={allocation.id}><td>{allocation.student_username || allocation.student_name}</td><td>{allocation.room_number || "-"}</td><td>{allocation.bed_label || allocation.bed}</td><td>{allocation.move_in_date}</td><td>{allocation.move_out_date || "-"}</td><td>{allocation.is_active ? "Active" : "Closed"}</td><td>{allocation.is_active && <button className="btn btn-soft" onClick={() => releaseBed(allocation.student)}>Release</button>}</td></tr>)}
        </tbody></table></div>
      </div>
    </div>
  );
}
