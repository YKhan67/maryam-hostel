import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";

function listData(response) {
  return response.data?.results || response.data || [];
}

export default function PropertyManagementPage() {
  const [properties, setProperties] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [students, setStudents] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState("");

  const activeProperties = useMemo(() => properties.filter((property) => property.is_active !== false), [properties]);
  const activeBuildings = useMemo(() => buildings.filter((building) => building.is_active !== false), [buildings]);
  const activeFloors = useMemo(() => floors.filter((floor) => floor.is_active !== false), [floors]);
  const activeRooms = useMemo(() => rooms.filter((room) => room.is_active !== false), [rooms]);
  const activeBeds = useMemo(() => beds.filter((bed) => bed.is_active !== false), [beds]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [propertyForm, setPropertyForm] = useState({ hostel: "", name: "", code: "", property_type: "HOUSE" });
  const [buildingForm, setBuildingForm] = useState({ hostel: "", property: "", name: "" });
  const [floorForm, setFloorForm] = useState({ building: "", number: "" });
  const [roomForm, setRoomForm] = useState({ floor: "", number: "", room_type: "TRIPLE", is_ac: false, base_rent: "0" });
  const [bedForm, setBedForm] = useState({ room: "", label: "" });
  const [bulkBedForm, setBulkBedForm] = useState({ room: "", count: "", start_label: "A" });
  const [activeTab, setActiveTab] = useState("operations");
  const [editTarget, setEditTarget] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [hostelResponse, propertyResponse, buildingResponse, floorResponse, roomResponse, bedResponse, studentResponse, allocationResponse] = await Promise.all([
        api.get("hostels/"),
        api.get("properties/"),
        api.get("buildings/"),
        api.get("floors/"),
        api.get("rooms/"),
        api.get("beds/"),
        api.get("students/"),
        api.get("bed-allocations/"),
      ]);
      setHostels(listData(hostelResponse).sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })));
      setProperties(listData(propertyResponse).sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })));
      setBuildings(listData(buildingResponse).sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })));
      setFloors(listData(floorResponse).sort((a, b) => Number(a.number || 0) - Number(b.number || 0)));
      setRooms(listData(roomResponse).sort((a, b) => (a.number || "").localeCompare(b.number || "", undefined, { sensitivity: "base" })));
      setBeds(listData(bedResponse).sort((a, b) => (a.label || "").localeCompare(b.label || "", undefined, { sensitivity: "base" })));
      setStudents(listData(studentResponse).sort((a, b) => studentDisplayName(a).localeCompare(studentDisplayName(b), undefined, { sensitivity: "base" })));
      setAllocations(listData(allocationResponse));
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to load property and allocation data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const assignedBedIds = useMemo(
    () => new Set(students.filter((student) => student.bed).map((student) => String(student.bed))),
    [students]
  );

  function studentDisplayName(student) {
    const firstName = student.user?.first_name?.trim() || "";
    const lastName = student.user?.last_name?.trim() || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || student.user?.username || `Student ${student.id}`;
  }

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return students
      .filter((student) => student.is_active)
      .filter((student) => {
        if (!query) return true;
        const searchable = [
          student.user?.first_name,
          student.user?.last_name,
          studentDisplayName(student),
          student.user?.username,
        ].filter(Boolean).join(" ").toLowerCase();
        return searchable.includes(query);
      })
      .sort((a, b) => studentDisplayName(a).localeCompare(studentDisplayName(b), undefined, { sensitivity: "base" }))
      .slice(0, 50);
  }, [students, studentSearch]);

  const selectedStudentRecord = students.find(
    (student) => String(student.id) === String(selectedStudent)
  );

  const currentBed = selectedStudentRecord?.bed
    ? beds.find((bed) => String(bed.id) === String(selectedStudentRecord.bed))
    : null;

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

  async function createRecord(endpoint, payload, successMessage, reset) {
    try {
      await api.post(endpoint, payload);
      setMessage(successMessage);
      reset();
      await loadData();
    } catch (error) {
      const detail = error.response?.data;
      setMessage(detail?.detail || JSON.stringify(detail) || "Unable to save setup record.");
    }
  }

  async function updateRecord(endpoint, id, payload) {
    try {
      await api.patch(`${endpoint}${id}/`, payload);
      setMessage("Record updated.");
      setEditTarget(null);
      await loadData();
    } catch (error) {
      const detail = error.response?.data;
      setMessage(detail?.detail || JSON.stringify(detail) || "Unable to update record.");
    }
  }

  async function toggleActive(endpoint, id) {
    try {
      await api.post(`${endpoint}${id}/toggle-active/`);
      setMessage("Record status updated.");
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to update record status.");
    }
  }

  function beginEdit(type, item) {
    setEditTarget({ type, id: item.id, data: { ...item } });
  }

  function editValue(key, value) {
    setEditTarget((current) => ({ ...current, data: { ...current.data, [key]: value } }));
  }

  function saveEdit(event) {
    event.preventDefault();
    const endpointByType = { property: "properties/", building: "buildings/", floor: "floors/", room: "rooms/", bed: "beds/" };
    const { type, id, data } = editTarget;
    const payloadByType = {
      property: { hostel: data.hostel, name: data.name, code: data.code, property_type: data.property_type, address: data.address || "", acquisition_date: data.acquisition_date || null },
      building: { hostel: data.hostel, property: data.property || null, name: data.name },
      floor: { building: data.building, number: Number(data.number) },
      room: { floor: data.floor, number: data.number, room_type: data.room_type, is_ac: data.is_ac, base_rent: data.base_rent },
      bed: { room: data.room, label: data.label },
    };
    updateRecord(endpointByType[type], id, payloadByType[type]);
  }

  function submitProperty(event) {
    event.preventDefault();
    createRecord("properties/", propertyForm, "Property created.", () => setPropertyForm({ hostel: "", name: "", code: "", property_type: "HOUSE" }));
  }

  function submitBuilding(event) {
    event.preventDefault();
    createRecord("buildings/", buildingForm, "Building created.", () => setBuildingForm({ hostel: "", property: "", name: "" }));
  }

  function submitFloor(event) {
    event.preventDefault();
    createRecord("floors/", floorForm, "Floor created.", () => setFloorForm({ building: "", number: "" }));
  }

  function submitRoom(event) {
    event.preventDefault();
    createRecord("rooms/", roomForm, "Room created.", () => setRoomForm({ floor: "", number: "", room_type: "TRIPLE", is_ac: false, base_rent: "0" }));
  }

  function submitBed(event) {
    event.preventDefault();
    createRecord("beds/", bedForm, "Bed created.", () => setBedForm({ room: "", label: "" }));
  }

  function submitBulkBeds(event) {
    event.preventDefault();
    createRecord(`rooms/${bulkBedForm.room}/bulk-beds/`, {
      count: Number(bulkBedForm.count),
      start_label: bulkBedForm.start_label,
    }, "Beds created.", () => setBulkBedForm({ room: "", count: "", start_label: "A" }));
  }

  if (loading) return <div className="page management-page"><p>Loading property operations...</p></div>;

  return (
    <div className="page management-page">
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Property and Bed Operations</h2>
        <p className="card-subtext">Properties remain under their hostel; occupancy is derived from student assignments.</p>
        {message && <p style={{ color: "var(--brand-gold)" }}>{message}</p>}
      </div>

      <div className="card" style={{ marginBottom: 24, display: "flex", gap: 8 }}>
        <button type="button" className={`btn ${activeTab === "operations" ? "btn-primary" : "btn-soft"}`} onClick={() => setActiveTab("operations")}>Property and Bed Operations</button>
        <button type="button" className={`btn ${activeTab === "maintenance" ? "btn-primary" : "btn-soft"}`} onClick={() => setActiveTab("maintenance")}>Property Maintenance</button>
      </div>

      {activeTab === "operations" && <>
      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Set up property capacity</h3>
        <p className="card-subtext">Create the physical hierarchy before assigning students. Structural writes require Super Admin access.</p>
        <div style={{ display: "grid", gap: 16 }}>
          <form onSubmit={submitProperty} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <label className="form-group">Hostel<select className="form-input" value={propertyForm.hostel} onChange={(event) => setPropertyForm({ ...propertyForm, hostel: event.target.value })} required><option value="">Hostel</option>{hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}</select></label>
            <label className="form-group">Property name<input className="form-input" value={propertyForm.name} onChange={(event) => setPropertyForm({ ...propertyForm, name: event.target.value })} required /></label>
            <label className="form-group">Code<input className="form-input" value={propertyForm.code} onChange={(event) => setPropertyForm({ ...propertyForm, code: event.target.value })} required /></label>
            <label className="form-group">Type<select className="form-input" value={propertyForm.property_type} onChange={(event) => setPropertyForm({ ...propertyForm, property_type: event.target.value })}><option value="HOUSE">House</option><option value="APARTMENT">Apartment</option><option value="BUILDING">Standalone Building</option></select></label>
            <button className="btn btn-primary" type="submit">Add property</button>
          </form>
          <form onSubmit={submitBuilding} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <label className="form-group">Hostel<select className="form-input" value={buildingForm.hostel} onChange={(event) => setBuildingForm({ ...buildingForm, hostel: event.target.value })} required><option value="">Hostel</option>{hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}</select></label>
            <label className="form-group">Property<select className="form-input" value={buildingForm.property} onChange={(event) => setBuildingForm({ ...buildingForm, property: event.target.value })} required><option value="">Property</option>{activeProperties.filter((property) => !buildingForm.hostel || String(property.hostel) === String(buildingForm.hostel)).map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
            <label className="form-group">Building name<input className="form-input" value={buildingForm.name} onChange={(event) => setBuildingForm({ ...buildingForm, name: event.target.value })} required /></label>
            <button className="btn btn-primary" type="submit">Add building</button>
          </form>
          <form onSubmit={submitFloor} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <label className="form-group">Building<select className="form-input" value={floorForm.building} onChange={(event) => setFloorForm({ ...floorForm, building: event.target.value })} required><option value="">Building</option>{activeBuildings.map((building) => <option key={building.id} value={building.id}>{building.property_name || building.name} / {building.name}</option>)}</select></label>
            <label className="form-group">Floor number<input className="form-input" type="number" value={floorForm.number} onChange={(event) => setFloorForm({ ...floorForm, number: event.target.value })} required /></label>
            <button className="btn btn-primary" type="submit">Add floor</button>
          </form>
          <form onSubmit={submitRoom} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <label className="form-group">Floor<select className="form-input" value={roomForm.floor} onChange={(event) => setRoomForm({ ...roomForm, floor: event.target.value })} required><option value="">Floor</option>{activeFloors.map((floor) => <option key={floor.id} value={floor.id}>{floor.property_name || floor.building_name} / Floor {floor.number}</option>)}</select></label>
            <label className="form-group">Room number<input className="form-input" value={roomForm.number} onChange={(event) => setRoomForm({ ...roomForm, number: event.target.value })} required /></label>
            <label className="form-group">Room type<select className="form-input" value={roomForm.room_type} onChange={(event) => setRoomForm({ ...roomForm, room_type: event.target.value })}><option value="SINGLE">Single</option><option value="DOUBLE">Double</option><option value="TRIPLE">Triple</option><option value="OTHER">Other</option></select></label>
            <label className="form-group">Base rent<input className="form-input" type="number" step="0.01" value={roomForm.base_rent} onChange={(event) => setRoomForm({ ...roomForm, base_rent: event.target.value })} /></label>
            <button className="btn btn-primary" type="submit">Add room</button>
          </form>
          <form onSubmit={submitBed} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <label className="form-group">Room<select className="form-input" value={bedForm.room} onChange={(event) => setBedForm({ ...bedForm, room: event.target.value })} required><option value="">Room</option>{activeRooms.map((room) => <option key={room.id} value={room.id}>{room.property_name || room.building_name} / Room {room.number}</option>)}</select></label>
            <label className="form-group">Bed label<input className="form-input" value={bedForm.label} onChange={(event) => setBedForm({ ...bedForm, label: event.target.value })} placeholder="A, B, C" required /></label>
            <button className="btn btn-primary" type="submit">Add bed</button>
          </form>
          <form onSubmit={submitBulkBeds} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <label className="form-group">Bulk room<select className="form-input" value={bulkBedForm.room} onChange={(event) => setBulkBedForm({ ...bulkBedForm, room: event.target.value })} required><option value="">Room</option>{activeRooms.map((room) => <option key={room.id} value={room.id}>{room.property_name || room.building_name} / Room {room.number}</option>)}</select></label>
            <label className="form-group">Number of beds<input className="form-input" type="number" min="1" max="100" value={bulkBedForm.count} onChange={(event) => setBulkBedForm({ ...bulkBedForm, count: event.target.value })} required /></label>
            <label className="form-group">Start label<input className="form-input" maxLength="10" value={bulkBedForm.start_label} onChange={(event) => setBulkBedForm({ ...bulkBedForm, start_label: event.target.value })} required /></label>
            <button className="btn btn-primary" type="submit">Add beds in bulk</button>
          </form>
        </div>
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
          <label className="form-group" style={{ position: "relative" }}>Student
            <input
              className="form-input"
              value={studentSearch}
              onChange={(event) => {
                setStudentSearch(event.target.value);
                setSelectedStudent("");
                setStudentPickerOpen(true);
              }}
              onFocus={() => setStudentPickerOpen(true)}
              placeholder="Type student first or last name"
              autoComplete="off"
              required={!selectedStudent}
            />
            {studentPickerOpen && !selectedStudent && (
              <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #cbd5e1", background: "#fff", position: "absolute", zIndex: 10, width: "min(360px, 100%)", boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)" }}>
                {filteredStudents.length === 0 && <div style={{ padding: 10, color: "#64748b" }}>No active student found.</div>}
                {filteredStudents.map((student) => (
                  <button
                    type="button"
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(String(student.id));
                      setStudentSearch(studentDisplayName(student));
                      setStudentPickerOpen(false);
                    }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", border: 0, borderBottom: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
                  >
                    <strong>{studentDisplayName(student)}</strong>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b" }}>{student.user?.username || `Student #${student.id}`}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedStudentRecord && (
              <div style={{ marginTop: 6, fontSize: "0.8rem", color: currentBed ? "#166534" : "#b45309" }}>
                {currentBed
                  ? `Current bed: ${currentBed.property_name || "Property"} / Room ${currentBed.room_number || currentBed.room} / Bed ${currentBed.label}`
                  : "No bed assigned"}
              </div>
            )}
          </label>
          <label className="form-group">Bed
            <select className="form-input" value={selectedBed} onChange={(event) => setSelectedBed(event.target.value)} required>
              <option value="">Select available bed</option>
              {activeBeds.filter((bed) => !assignedBedIds.has(String(bed.id))).map((bed) => (
                <option key={bed.id} value={bed.id}>{bed.property_name || "Property"} / Room {bed.room_number || bed.room} / Bed {bed.label}</option>
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
          {allocations.map((allocation) => <tr key={allocation.id}><td>{allocation.student_name || allocation.student_username || `Student #${allocation.student}`}</td><td>{allocation.room_number || "-"}</td><td>{allocation.bed_label || allocation.bed}</td><td>{allocation.move_in_date}</td><td>{allocation.move_out_date || "-"}</td><td>{allocation.is_active ? "Active" : "Closed"}</td><td>{allocation.is_active && <button className="btn btn-soft" onClick={() => releaseBed(allocation.student)}>Release</button>}</td></tr>)}
        </tbody></table></div>
      </div>
      </>}

      {activeTab === "maintenance" && (
        <div>
          {editTarget && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3>Edit {editTarget.type}</h3>
              <form onSubmit={saveEdit} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) auto", gap: 10, alignItems: "end" }}>
                {editTarget.type === "property" && <>
                  <label className="form-group">Name<input className="form-input" value={editTarget.data.name || ""} onChange={(event) => editValue("name", event.target.value)} required /></label>
                  <label className="form-group">Code<input className="form-input" value={editTarget.data.code || ""} onChange={(event) => editValue("code", event.target.value)} required /></label>
                  <label className="form-group">Type<select className="form-input" value={editTarget.data.property_type || "BUILDING"} onChange={(event) => editValue("property_type", event.target.value)}><option value="HOUSE">House</option><option value="APARTMENT">Apartment</option><option value="BUILDING">Standalone Building</option></select></label>
                  <label className="form-group">Address<input className="form-input" value={editTarget.data.address || ""} onChange={(event) => editValue("address", event.target.value)} /></label>
                </>}
                {editTarget.type === "building" && <label className="form-group">Name<input className="form-input" value={editTarget.data.name || ""} onChange={(event) => editValue("name", event.target.value)} required /></label>}
                {editTarget.type === "floor" && <label className="form-group">Floor number<input className="form-input" type="number" value={editTarget.data.number ?? ""} onChange={(event) => editValue("number", event.target.value)} required /></label>}
                {editTarget.type === "room" && <>
                  <label className="form-group">Room number<input className="form-input" value={editTarget.data.number || ""} onChange={(event) => editValue("number", event.target.value)} required /></label>
                  <label className="form-group">Room type<select className="form-input" value={editTarget.data.room_type || "TRIPLE"} onChange={(event) => editValue("room_type", event.target.value)}><option value="SINGLE">Single</option><option value="DOUBLE">Double</option><option value="TRIPLE">Triple</option><option value="OTHER">Other</option></select></label>
                  <label className="form-group">Base rent<input className="form-input" type="number" step="0.01" value={editTarget.data.base_rent ?? "0"} onChange={(event) => editValue("base_rent", event.target.value)} /></label>
                  <label className="form-group">AC<input type="checkbox" checked={Boolean(editTarget.data.is_ac)} onChange={(event) => editValue("is_ac", event.target.checked)} /></label>
                </>}
                {editTarget.type === "bed" && <label className="form-group">Bed label<input className="form-input" value={editTarget.data.label || ""} onChange={(event) => editValue("label", event.target.value)} required /></label>}
                <button className="btn btn-primary" type="submit">Save changes</button>
                <button className="btn btn-soft" type="button" onClick={() => setEditTarget(null)}>Cancel</button>
              </form>
            </div>
          )}

          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Properties</h3>
            <div className="table-wrapper"><table className="table"><thead><tr><th>Property</th><th>Hostel</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {properties.map((item) => <tr key={item.id}><td>{item.name} ({item.code})</td><td>{item.hostel_name || item.hostel}</td><td>{item.is_active ? "Active" : "Inactive"}</td><td><button className="btn btn-soft" onClick={() => beginEdit("property", item)}>Edit</button>{" "}<button className="btn btn-soft" onClick={() => toggleActive("properties/", item.id)}>{item.is_active ? "Deactivate" : "Activate"}</button></td></tr>)}
            </tbody></table></div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Buildings</h3>
            <div className="table-wrapper"><table className="table"><thead><tr><th>Building</th><th>Property</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {buildings.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.property_name || item.property || "-"}</td><td>{item.is_active ? "Active" : "Inactive"}</td><td><button className="btn btn-soft" onClick={() => beginEdit("building", item)}>Edit</button>{" "}<button className="btn btn-soft" onClick={() => toggleActive("buildings/", item.id)}>{item.is_active ? "Deactivate" : "Activate"}</button></td></tr>)}
            </tbody></table></div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Floors</h3>
            <div className="table-wrapper"><table className="table"><thead><tr><th>Floor</th><th>Building</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {floors.map((item) => <tr key={item.id}><td>{item.number}</td><td>{item.building_name || item.building}</td><td>{item.is_active ? "Active" : "Inactive"}</td><td><button className="btn btn-soft" onClick={() => beginEdit("floor", item)}>Edit</button>{" "}<button className="btn btn-soft" onClick={() => toggleActive("floors/", item.id)}>{item.is_active ? "Deactivate" : "Activate"}</button></td></tr>)}
            </tbody></table></div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Rooms</h3>
            <div className="table-wrapper"><table className="table"><thead><tr><th>Room</th><th>Building</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {rooms.map((item) => <tr key={item.id}><td>{item.number}</td><td>{item.building_name || item.floor}</td><td>{item.is_active ? "Active" : "Inactive"}</td><td><button className="btn btn-soft" onClick={() => beginEdit("room", item)}>Edit</button>{" "}<button className="btn btn-soft" onClick={() => toggleActive("rooms/", item.id)}>{item.is_active ? "Deactivate" : "Activate"}</button></td></tr>)}
            </tbody></table></div>
          </div>

          <div className="card">
            <h3>Beds</h3>
            <div className="table-wrapper"><table className="table"><thead><tr><th>Bed</th><th>Room</th><th>Student</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {beds.map((item) => <tr key={item.id}><td>{item.label}</td><td>{item.room_number || item.room}</td><td>{item.student_id ? `Assigned student #${item.student_id}` : "Unassigned"}</td><td>{item.is_active ? "Active" : "Inactive"}</td><td><button className="btn btn-soft" onClick={() => beginEdit("bed", item)}>Edit</button>{" "}<button className="btn btn-soft" onClick={() => toggleActive("beds/", item.id)}>{item.is_active ? "Deactivate" : "Activate"}</button></td></tr>)}
            </tbody></table></div>
          </div>
        </div>
      )}
    </div>
  );
}
