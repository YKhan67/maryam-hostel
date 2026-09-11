import React, { useEffect, useState } from "react";
import api from "../api";

function rows(response) {
  return response.data?.results || response.data || [];
}

const emptyContract = { property: "", landlord_name: "", landlord_contact: "", start_date: "", end_date: "", monthly_rent: "", landlord_deposit: "", notes: "" };
const emptyAccess = { investor: "", property: "" };
const emptyOwnership = { investor: "", property: "", ownership_percentage: "", effective_from: "" };
const emptyAccrual = { property: "", contract: "", month: "", amount: "" };
const emptyPayment = { accrual: "", amount: "", paid_on: "", notes: "" };
const emptySharedCost = { hostel: "", property: "", date: "", category: "", amount: "", description: "" };

export default function PropertyFinancePage() {
  const [properties, setProperties] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [partners, setPartners] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [access, setAccess] = useState([]);
  const [ownership, setOwnership] = useState([]);
  const [accruals, setAccruals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sharedCosts, setSharedCosts] = useState([]);
  const [contract, setContract] = useState(emptyContract);
  const [accessForm, setAccessForm] = useState(emptyAccess);
  const [ownershipForm, setOwnershipForm] = useState(emptyOwnership);
  const [accrual, setAccrual] = useState(emptyAccrual);
  const [payment, setPayment] = useState(emptyPayment);
  const [sharedCost, setSharedCost] = useState(emptySharedCost);
  const [editing, setEditing] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const responses = await Promise.all([
        api.get("hostels/"),
        api.get("properties/"),
        api.get("users/?role=PARTNER"),
        api.get("finance/rental-contracts/"),
        api.get("finance/investor-property-access/"),
        api.get("finance/investor-property-ownership/"),
        api.get("finance/rent-accruals/"),
        api.get("finance/rent-payments/"),
        api.get("finance/shared-costs/"),
      ]);
      setHostels(rows(responses[0]).sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })));
      setProperties(rows(responses[1]).filter((property) => property.is_active !== false).sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })));
      setPartners(rows(responses[2]).filter((user) => user.role === "PARTNER"));
      setContracts(rows(responses[3]));
      setAccess(rows(responses[4]));
      setOwnership(rows(responses[5]));
      setAccruals(rows(responses[6]));
      setPayments(rows(responses[7]));
      setSharedCosts(rows(responses[8]));
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to load property finance data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function submit(endpoint, payload, reset, success, editKey) {
    try {
      const recordId = editing[editKey];
      if (recordId) {
        await api.patch(`${endpoint}${recordId}/`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setMessage(success);
      reset();
      setEditing((current) => ({ ...current, [editKey]: null }));
      await loadData();
    } catch (error) {
      const detail = error.response?.data;
      setMessage(detail?.detail || JSON.stringify(detail) || "Unable to save finance record.");
    }
  }

  function submitContract(event) {
    event.preventDefault();
    submit("finance/rental-contracts/", contract, () => setContract(emptyContract), "Rental contract saved.", "contract");
  }

  function submitAccess(event) {
    event.preventDefault();
    submit("finance/investor-property-access/", { ...accessForm, can_view_financials: true }, () => setAccessForm(emptyAccess), "Investor financial access saved.", "access");
  }

  function submitOwnership(event) {
    event.preventDefault();
    submit("finance/investor-property-ownership/", ownershipForm, () => setOwnershipForm(emptyOwnership), "Ownership share saved.", "ownership");
  }

  function submitAccrual(event) {
    event.preventDefault();
    submit("finance/rent-accruals/", accrual, () => setAccrual(emptyAccrual), "Rent accrual saved.", "accrual");
  }

  function submitPayment(event) {
    event.preventDefault();
    submit("finance/rent-payments/", payment, () => setPayment(emptyPayment), "Rent payment recorded.", "payment");
  }

  function submitSharedCost(event) {
    event.preventDefault();
    submit("finance/shared-costs/", sharedCost, () => setSharedCost(emptySharedCost), "Shared cost saved.", "sharedCost");
  }

  async function deleteRecord(endpoint, id, label) {
    if (!window.confirm(`Delete this ${label}? This action cannot be undone.`)) return;
    try {
      await api.delete(`${endpoint}${id}/`);
      setMessage(`${label} deleted.`);
      await loadData();
    } catch (error) {
      const detail = error.response?.data;
      setMessage(detail?.detail || JSON.stringify(detail) || `Unable to delete ${label}.`);
    }
  }

  function beginEdit(key, record, setter) {
    const editable = { ...record };
    if (key === "accrual") {
      delete editable.paid_amount;
      delete editable.outstanding_amount;
      delete editable.paid_on;
      delete editable.notes;
    }
    setter(editable);
    setEditing((current) => ({ ...current, [key]: record.id }));
  }

  function cancelEdit(key, reset) {
    setEditing((current) => ({ ...current, [key]: null }));
    reset();
  }

  function actions(key, endpoint, record, label, setter, reset) {
    return <td style={{ whiteSpace: "nowrap" }}><button type="button" className="btn btn-soft" onClick={() => beginEdit(key, record, setter)}>Edit</button> <button type="button" className="btn btn-danger" onClick={() => deleteRecord(endpoint, record.id, label)}>Delete</button>{editing[key] === record.id && <button type="button" className="btn btn-soft" onClick={() => cancelEdit(key, reset)}>Cancel</button>}</td>;
  }

  if (loading) return <div className="page management-page"><p>Loading property finance...</p></div>;

  return (
    <div className="page management-page">
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Property Finance</h2>
        <p className="card-subtext">Configure property rent, investor financial access, ownership shares, and monthly accruals.</p>
        {message && <p style={{ color: "var(--brand-gold)" }}>{message}</p>}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Rental contract</h3>
        <form onSubmit={submitContract} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <label className="form-group">Property<select className="form-input" value={contract.property} onChange={(event) => setContract({ ...contract, property: event.target.value })} required><option value="">Select property</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-group">Landlord<input className="form-input" value={contract.landlord_name} onChange={(event) => setContract({ ...contract, landlord_name: event.target.value })} required /></label>
          <label className="form-group">Start date<input className="form-input" type="date" value={contract.start_date} onChange={(event) => setContract({ ...contract, start_date: event.target.value })} required /></label>
          <label className="form-group">End date<input className="form-input" type="date" value={contract.end_date} onChange={(event) => setContract({ ...contract, end_date: event.target.value })} /></label>
          <label className="form-group">Monthly rent<input className="form-input" type="number" step="0.01" value={contract.monthly_rent} onChange={(event) => setContract({ ...contract, monthly_rent: event.target.value })} required /></label>
          <label className="form-group">Landlord deposit<input className="form-input" type="number" step="0.01" value={contract.landlord_deposit} onChange={(event) => setContract({ ...contract, landlord_deposit: event.target.value })} /></label>
          <label className="form-group">Contact<input className="form-input" value={contract.landlord_contact} onChange={(event) => setContract({ ...contract, landlord_contact: event.target.value })} /></label>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: "end" }}>{editing.contract ? "Update contract" : "Save contract"}</button>
        </form>
        <div className="table-wrapper"><table className="table"><thead><tr><th>Property</th><th>Landlord</th><th>Dates</th><th>Monthly rent</th><th>Actions</th></tr></thead><tbody>
          {contracts.map((item) => <tr key={item.id}><td>{properties.find((property) => property.id === item.property)?.name || item.property}</td><td>{item.landlord_name}</td><td>{item.start_date} to {item.end_date || "ongoing"}</td><td>Rs {item.monthly_rent}</td>{actions("contract", "finance/rental-contracts/", item, "rental contract", setContract, () => setContract(emptyContract))}</tr>)}
          {!contracts.length && <tr><td colSpan="5">No rental contracts recorded.</td></tr>}
        </tbody></table></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Shared or property operating cost</h3>
        <p className="card-subtext">Leave Property empty for a hostel-wide cost; assign it to a property when the cost is specific.</p>
        <form onSubmit={submitSharedCost} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <label className="form-group">Hostel<select className="form-input" value={sharedCost.hostel} onChange={(event) => setSharedCost({ ...sharedCost, hostel: event.target.value })} required><option value="">Select hostel</option>{hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}</select></label>
          <label className="form-group">Property<select className="form-input" value={sharedCost.property} onChange={(event) => setSharedCost({ ...sharedCost, property: event.target.value })}><option value="">Hostel-wide</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-group">Date<input className="form-input" type="date" value={sharedCost.date} onChange={(event) => setSharedCost({ ...sharedCost, date: event.target.value })} required /></label>
          <label className="form-group">Category<input className="form-input" value={sharedCost.category} onChange={(event) => setSharedCost({ ...sharedCost, category: event.target.value })} placeholder="Utilities, repairs..." required /></label>
          <label className="form-group">Amount<input className="form-input" type="number" step="0.01" value={sharedCost.amount} onChange={(event) => setSharedCost({ ...sharedCost, amount: event.target.value })} required /></label>
          <label className="form-group" style={{ gridColumn: "span 2" }}>Description<input className="form-input" value={sharedCost.description} onChange={(event) => setSharedCost({ ...sharedCost, description: event.target.value })} /></label>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: "end" }}>{editing.sharedCost ? "Update cost" : "Save cost"}</button>
        </form>
        <div className="table-wrapper"><table className="table"><thead><tr><th>Date</th><th>Hostel</th><th>Property</th><th>Category</th><th>Amount</th><th>Actions</th></tr></thead><tbody>
          {sharedCosts.map((item) => <tr key={item.id}><td>{item.date}</td><td>{hostels.find((hostel) => hostel.id === item.hostel)?.name || item.hostel}</td><td>{properties.find((property) => property.id === item.property)?.name || "Hostel-wide"}</td><td>{item.category}</td><td>Rs {item.amount}</td>{actions("sharedCost", "finance/shared-costs/", item, "shared cost", setSharedCost, () => setSharedCost(emptySharedCost))}</tr>)}
          {!sharedCosts.length && <tr><td colSpan="6">No operating costs recorded.</td></tr>}
        </tbody></table></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Investor financial access</h3>
        <form onSubmit={submitAccess} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <label className="form-group">Investor<select className="form-input" value={accessForm.investor} onChange={(event) => setAccessForm({ ...accessForm, investor: event.target.value })} required><option value="">Select investor</option>{partners.map((user) => <option key={user.id} value={user.id}>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username}</option>)}</select></label>
          <label className="form-group">Property<select className="form-input" value={accessForm.property} onChange={(event) => setAccessForm({ ...accessForm, property: event.target.value })} required><option value="">Select property</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button className="btn btn-primary" type="submit">{editing.access ? "Update access" : "Grant finance access"}</button>
        </form>
        <div className="table-wrapper"><table className="table"><thead><tr><th>Investor</th><th>Property</th><th>Access</th><th>Actions</th></tr></thead><tbody>
          {access.map((item) => <tr key={item.id}><td>{partners.find((partner) => partner.id === item.investor)?.username || item.investor}</td><td>{properties.find((property) => property.id === item.property)?.name || item.property}</td><td>{item.can_view_financials ? "Granted" : "Revoked"}</td>{actions("access", "finance/investor-property-access/", item, "access record", setAccessForm, () => setAccessForm(emptyAccess))}</tr>)}
          {!access.length && <tr><td colSpan="4">No investor access records.</td></tr>}
        </tbody></table></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Investor ownership</h3>
        <form onSubmit={submitOwnership} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <label className="form-group">Investor<select className="form-input" value={ownershipForm.investor} onChange={(event) => setOwnershipForm({ ...ownershipForm, investor: event.target.value })} required><option value="">Investor</option>{partners.map((user) => <option key={user.id} value={user.id}>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username}</option>)}</select></label>
          <label className="form-group">Property<select className="form-input" value={ownershipForm.property} onChange={(event) => setOwnershipForm({ ...ownershipForm, property: event.target.value })} required><option value="">Property</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-group">Share %<input className="form-input" type="number" min="0" max="100" step="0.01" value={ownershipForm.ownership_percentage} onChange={(event) => setOwnershipForm({ ...ownershipForm, ownership_percentage: event.target.value })} required /></label>
          <label className="form-group">Effective from<input className="form-input" type="date" value={ownershipForm.effective_from} onChange={(event) => setOwnershipForm({ ...ownershipForm, effective_from: event.target.value })} required /></label>
          <button className="btn btn-primary" type="submit">{editing.ownership ? "Update ownership" : "Save ownership"}</button>
        </form>
        <div className="table-wrapper"><table className="table"><thead><tr><th>Investor</th><th>Property</th><th>Share</th><th>Effective from</th><th>Actions</th></tr></thead><tbody>
          {ownership.map((item) => <tr key={item.id}><td>{partners.find((partner) => partner.id === item.investor)?.username || item.investor}</td><td>{properties.find((property) => property.id === item.property)?.name || item.property}</td><td>{item.ownership_percentage}%</td><td>{item.effective_from}</td>{actions("ownership", "finance/investor-property-ownership/", item, "ownership record", setOwnershipForm, () => setOwnershipForm(emptyOwnership))}</tr>)}
          {!ownership.length && <tr><td colSpan="5">No ownership records.</td></tr>}
        </tbody></table></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Monthly rent accrual ({accruals.length} recorded)</h3>
        <form onSubmit={submitAccrual} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <label className="form-group">Property<select className="form-input" value={accrual.property} onChange={(event) => setAccrual({ ...accrual, property: event.target.value })} required><option value="">Property</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-group">Contract<select className="form-input" value={accrual.contract} onChange={(event) => setAccrual({ ...accrual, contract: event.target.value })} required><option value="">Contract</option>{contracts.map((item) => <option key={item.id} value={item.id}>{item.landlord_name} / Rs {item.monthly_rent}</option>)}</select></label>
          <label className="form-group">Month<input className="form-input" type="date" value={accrual.month} onChange={(event) => setAccrual({ ...accrual, month: event.target.value })} required /></label>
          <label className="form-group">Amount<input className="form-input" type="number" step="0.01" value={accrual.amount} onChange={(event) => setAccrual({ ...accrual, amount: event.target.value })} required /></label>
          <button className="btn btn-primary" type="submit">{editing.accrual ? "Update accrual" : "Accrue rent"}</button>
        </form>
        <div className="table-wrapper"><table className="table"><thead><tr><th>Property</th><th>Month</th><th>Amount</th><th>Paid</th><th>Outstanding</th><th>Actions</th></tr></thead><tbody>
          {accruals.map((item) => <tr key={item.id}><td>{properties.find((property) => property.id === item.property)?.name || item.property}</td><td>{item.month}</td><td>Rs {item.amount}</td><td>Rs {item.paid_amount || 0}</td><td>Rs {item.outstanding_amount ?? Number(item.amount || 0) - Number(item.paid_amount || 0)}</td>{actions("accrual", "finance/rent-accruals/", item, "rent accrual", setAccrual, () => setAccrual(emptyAccrual))}</tr>)}
          {!accruals.length && <tr><td colSpan="6">No rent accruals recorded.</td></tr>}
        </tbody></table></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Property rent payment</h3>
        <p className="card-subtext">Record full or partial payments against an existing monthly rent accrual.</p>
        <form onSubmit={submitPayment} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 2fr auto", gap: 10, alignItems: "end" }}>
          <label className="form-group">Rent obligation<select className="form-input" value={payment.accrual} onChange={(event) => setPayment({ ...payment, accrual: event.target.value })} required>
            <option value="">Select rent obligation</option>
            {accruals.filter((item) => Number(item.amount) > Number(item.paid_amount || 0)).map((item) => {
              const property = properties.find((candidate) => String(candidate.id) === String(item.property));
              return <option key={item.id} value={item.id}>{property?.name || item.property} / {item.month} / Due Rs {item.amount} / Outstanding Rs {(Number(item.amount) - Number(item.paid_amount || 0)).toFixed(2)}</option>;
            })}
          </select></label>
          <label className="form-group">Payment amount<input className="form-input" type="number" min="0.01" step="0.01" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} required /></label>
          <label className="form-group">Paid on<input className="form-input" type="date" value={payment.paid_on} onChange={(event) => setPayment({ ...payment, paid_on: event.target.value })} required /></label>
          <label className="form-group">Notes<input className="form-input" value={payment.notes} onChange={(event) => setPayment({ ...payment, notes: event.target.value })} /></label>
          <button className="btn btn-primary" type="submit">{editing.payment ? "Update payment" : "Record payment"}</button>
        </form>
        {editing.payment && <button type="button" className="btn btn-soft" onClick={() => cancelEdit("payment", () => setPayment(emptyPayment))}>Cancel payment edit</button>}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Rent payment history ({payments.length})</h3>
        <div className="table-wrapper"><table className="table"><thead><tr><th>Property</th><th>Month</th><th>Paid on</th><th>Amount</th><th>Notes</th><th>Actions</th></tr></thead><tbody>
          {payments.map((item) => <tr key={item.id}><td>{item.property_name || item.accrual}</td><td>{item.month || "-"}</td><td>{item.paid_on}</td><td>Rs {item.amount}</td><td>{item.notes || "-"}</td>{actions("payment", "finance/rent-payments/", item, "rent payment", setPayment, () => setPayment(emptyPayment))}</tr>)}
          {!payments.length && <tr><td colSpan="6">No rent payments recorded.</td></tr>}
        </tbody></table></div>
      </div>

      <div className="card">
        <h3>Current ownership and access records</h3>
        <div className="table-wrapper"><table className="table"><thead><tr><th>Investor</th><th>Property</th><th>Ownership</th><th>Finance access</th></tr></thead><tbody>
          {properties.map((property) => {
            const propertyOwnership = ownership.filter((item) => String(item.property) === String(property.id));
            const propertyAccess = access.filter((item) => String(item.property) === String(property.id));
            return <tr key={property.id}><td>{propertyAccess.map((item) => partners.find((user) => user.id === item.investor)?.username || item.investor).join(", ") || "-"}</td><td>{property.name}</td><td>{propertyOwnership.map((item) => `${partners.find((user) => user.id === item.investor)?.username || item.investor}: ${item.ownership_percentage}%`).join("; ") || "-"}</td><td>{propertyAccess.length ? "Granted" : "None"}</td></tr>;
          })}
        </tbody></table></div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}
