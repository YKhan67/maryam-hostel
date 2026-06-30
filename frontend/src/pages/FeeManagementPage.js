// src/pages/FeeManagementPage.js

import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../api";

function getCurrentMonthYear() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// Try to build a nice display name from whatever fields exist
function getStudentLabel(s) {
  if (!s) return "Unknown student";

  const parts = [];
  if (s.first_name) parts.push(s.first_name);
  if (s.last_name) parts.push(s.last_name);
  if (parts.length) return parts.join(" ");

  if (s.full_name) return s.full_name;
  if (s.name) return s.name;

  if (s.user) {
    const u = s.user;
    const uparts = [];
    if (u.first_name) uparts.push(u.first_name);
    if (u.last_name) uparts.push(u.last_name);
    if (uparts.length) return uparts.join(" ");
    if (u.full_name) return u.full_name;
    if (u.username) return u.username;
  }

  if (s.username) return s.username;

  return `Student ${s.id}`;
}

export default function FeeManagementPage() {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentsError, setStudentsError] = useState(null);

  const { year: currentYear, month: currentMonth } = getCurrentMonthYear();

  // 1) Generate fees
  const [genScope, setGenScope] = useState("ALL");
  const [genStudentId, setGenStudentId] = useState("");
  const [genYear, setGenYear] = useState(currentYear);
  const [genMonth, setGenMonth] = useState(currentMonth);
  const [genLoading, setGenLoading] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  // 2) Mark paid
  const [markScope, setMarkScope] = useState("ALL");
  const [markStudentId, setMarkStudentId] = useState("");
  const [markYear, setMarkYear] = useState(currentYear);
  const [markMonth, setMarkMonth] = useState(currentMonth);
  const [markAllMonths, setMarkAllMonths] = useState(false);
  const [markLoading, setMarkLoading] = useState(false);
  const [markMessage, setMarkMessage] = useState("");

  // 3) WhatsApp pending
  const [waScope, setWaScope] = useState("ALL");
  const [waStudentId, setWaStudentId] = useState("");
  const [waYear, setWaYear] = useState(currentYear);
  const [waMonth, setWaMonth] = useState(currentMonth);
  const [waAllMonths, setWaAllMonths] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [waMessage, setWaMessage] = useState("");

  // 4) Fine waiver
  const [wvScope, setWvScope] = useState("ALL");
  const [wvStudentId, setWvStudentId] = useState("");
  const [wvYear, setWvYear] = useState(currentYear);
  const [wvMonth, setWvMonth] = useState(currentMonth);
  const [wvAllMonths, setWvAllMonths] = useState(false);
  const [wvKind, setWvKind] = useState("FULL"); // "FULL" | "PARTIAL"
  const [wvAmount, setWvAmount] = useState("");
  const [wvLoading, setWvLoading] = useState(false);
  const [wvMessage, setWvMessage] = useState("");

  // Load students
  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setLoadingStudents(true);
      setStudentsError(null);
      try {
        const resp = await api.get("/students/");
        let data = resp.data;
        if (!Array.isArray(data) && data && Array.isArray(data.results)) {
          data = data.results;
        }
        if (!Array.isArray(data)) {
          throw new Error("Unexpected response format from /students/");
        }
        if (isMounted) setStudents(data);
      } catch (err) {
        console.error("Failed to load students", err);
        if (isMounted) {
          setStudentsError(
            err.response?.data?.detail ||
              err.message ||
              "Failed to load students."
          );
        }
      } finally {
        if (isMounted) setLoadingStudents(false);
      }
    }

    loadStudents();
    return () => {
      isMounted = false;
    };
  }, []);

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const studentOptions = students.map((s) => ({
    value: s.id,
    label: getStudentLabel(s),
  }));

  // ─────────────────────────────────
  // 1) Generate fees
  // ─────────────────────────────────
  const handleGenerateFees = async (e) => {
    e.preventDefault();
    setGenMessage("");
    setGenLoading(true);

    try {
      const payload = {
        scope: genScope,
        year: Number(genYear),
        month: Number(genMonth),
      };
      if (genScope === "STUDENT" && genStudentId) {
        payload.student_id = Number(genStudentId);
      }

      const resp = await api.post("/fees/actions/generate-fees/", payload);
      setGenMessage(
        `Done. Created: ${resp.data.created ?? 0}, existing skipped: ${
          resp.data.skipped_existing ?? 0
        }.`
      );
    } catch (err) {
      console.error("Failed to generate fees", err);
      setGenMessage(
        err.response?.data?.detail || err.message || "Failed to generate fees."
      );
    } finally {
      setGenLoading(false);
    }
  };

  // ─────────────────────────────────
  // 2) Mark fees paid
  // ─────────────────────────────────
  const handleMarkPaid = async (e) => {
    e.preventDefault();
    setMarkMessage("");
    setMarkLoading(true);

    try {
      const payload = {
        scope: markScope,
        all_months: markAllMonths,
      };

      if (!markAllMonths) {
        payload.year = Number(markYear);
        payload.month = Number(markMonth);
      }
      if (markScope === "STUDENT" && markStudentId) {
        payload.student_id = Number(markStudentId);
      }

      const resp = await api.post("/fees/actions/mark-paid/", payload);
      setMarkMessage(
        `Done. Marked ${resp.data.updated ?? 0} record(s) as paid (out of ${
          resp.data.total ?? resp.data.selected ?? "?"
        }).`
      );
    } catch (err) {
      console.error("Failed to mark fees as paid", err);
      setMarkMessage(
        err.response?.data?.detail ||
          err.message ||
          "Failed to mark fees as paid."
      );
    } finally {
      setMarkLoading(false);
    }
  };

  // ─────────────────────────────────
  // 3) Send WhatsApp pending
  // ─────────────────────────────────
  const handleSendWhatsapp = async (e) => {
    e.preventDefault();
    setWaMessage("");
    setWaLoading(true);

    try {
      const payload = {
        scope: waScope,
        all_months: waAllMonths,
      };
      if (!waAllMonths) {
        payload.year = Number(waYear);
        payload.month = Number(waMonth);
      }
      if (waScope === "STUDENT" && waStudentId) {
        payload.student_id = Number(waStudentId);
      }

      const resp = await api.post(
        "/fees/actions/send-whatsapp-pending/",
        payload
      );
      setWaMessage(
        `WhatsApp sent to ${resp.data.sent ?? 0} students (total selected: ${
          resp.data.total ?? "?"
        }).`
      );
    } catch (err) {
      console.error("Failed to send WhatsApp reminders", err);
      setWaMessage(
        err.response?.data?.detail ||
          err.message ||
          "Failed to send WhatsApp reminders."
      );
    } finally {
      setWaLoading(false);
    }
  };

  // ─────────────────────────────────
  // 4) Fine waiver
  // ─────────────────────────────────
  const handleFineWaiver = async (e) => {
    e.preventDefault();
    setWvMessage("");
    setWvLoading(true);

    try {
      const payload = {
        scope: wvScope,
        all_months: wvAllMonths,
        kind: wvKind, // "FULL" or "PARTIAL"
      };

      if (!wvAllMonths) {
        payload.year = Number(wvYear);
        payload.month = Number(wvMonth);
      }
      if (wvScope === "STUDENT" && wvStudentId) {
        payload.student_id = Number(wvStudentId);
      }
      if (wvKind === "PARTIAL") {
        payload.partial_amount = Number(wvAmount || 0);
      }

      const resp = await api.post("/fees/actions/waive-fine/", payload);
      setWvMessage(
        `Done. Updated fines on ${resp.data.updated ?? 0} record(s) (total matched: ${
          resp.data.total ?? "?"
        }).`
      );
    } catch (err) {
      console.error("Failed to waive fines", err);
      setWvMessage(
        err.response?.data?.detail ||
          err.message ||
          "Failed to apply fine waiver."
      );
    } finally {
      setWvLoading(false);
    }
  };

  return (
    <AppShell subtitle="Fee Management">
      <div className="page management-page">
        {loadingStudents && (
          <div className="card">
            <p>Loading students…</p>
          </div>
        )}

        {!loadingStudents && studentsError && (
          <div className="card">
            <p style={{ color: "#b91c1c" }}>{String(studentsError)}</p>
          </div>
        )}

        {/* 1) Generate monthly fees */}
        <div className="card">
          <div className="card-title">1. Generate Monthly Fees</div>
          <div className="card-subtext">
            Create monthly fee records for all students or a specific student.
          </div>

          <form onSubmit={handleGenerateFees} style={{ marginTop: 12 }}>
            <div className="filters-row">
              <div className="filter-group">
                <label className="filter-label">Apply to</label>
                <select
                  className="filter-select"
                  value={genScope}
                  onChange={(e) => setGenScope(e.target.value)}
                >
                  <option value="ALL">All students</option>
                  <option value="STUDENT">Specific student</option>
                </select>
              </div>

              {genScope === "STUDENT" && (
                <div className="filter-group">
                  <label className="filter-label">Student</label>
                  <select
                    className="filter-select"
                    value={genStudentId}
                    onChange={(e) => setGenStudentId(e.target.value)}
                  >
                    <option value="">Select student</option>
                    {studentOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="filter-group">
                <label className="filter-label">Month</label>
                <select
                  className="filter-select"
                  value={genMonth}
                  onChange={(e) => setGenMonth(Number(e.target.value))}
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Year</label>
                <input
                  type="number"
                  className="filter-input"
                  value={genYear}
                  onChange={(e) => setGenYear(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={genLoading}
              >
                {genLoading ? "Generating…" : "Generate Fees"}
              </button>
            </div>

            {genMessage && (
              <p style={{ marginTop: 8, fontSize: "0.85rem" }}>{genMessage}</p>
            )}
          </form>
        </div>

        {/* 2) Mark fees received */}
        <div className="card">
          <div className="card-title">2. Mark Fees as Received</div>
          <div className="card-subtext">
            Mark fees as paid for all students or a specific student, either for
            a single month or all months.
          </div>

          <form onSubmit={handleMarkPaid} style={{ marginTop: 12 }}>
            <div className="filters-row">
              <div className="filter-group">
                <label className="filter-label">Apply to</label>
                <select
                  className="filter-select"
                  value={markScope}
                  onChange={(e) => setMarkScope(e.target.value)}
                >
                  <option value="ALL">All students</option>
                  <option value="STUDENT">Specific student</option>
                </select>
              </div>

              {markScope === "STUDENT" && (
                <div className="filter-group">
                  <label className="filter-label">Student</label>
                  <select
                    className="filter-select"
                    value={markStudentId}
                    onChange={(e) => setMarkStudentId(e.target.value)}
                  >
                    <option value="">Select student</option>
                    {studentOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!markAllMonths && (
                <>
                  <div className="filter-group">
                    <label className="filter-label">Month</label>
                    <select
                      className="filter-select"
                      value={markMonth}
                      onChange={(e) => setMarkMonth(Number(e.target.value))}
                    >
                      {monthOptions.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Year</label>
                    <input
                      type="number"
                      className="filter-input"
                      value={markYear}
                      onChange={(e) => setMarkYear(Number(e.target.value))}
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={markAllMonths}
                  onChange={(e) => setMarkAllMonths(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Apply to <strong>all months</strong> (ignore selected month/year)
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={markLoading}
              >
                {markLoading ? "Updating…" : "Mark as Paid"}
              </button>
            </div>

            {markMessage && (
              <p style={{ marginTop: 8, fontSize: "0.85rem" }}>{markMessage}</p>
            )}
          </form>
        </div>

        {/* 3) Send WhatsApp reminders */}
        <div className="card">
          <div className="card-title">
            3. Send WhatsApp for Pending Fee / Fine
          </div>
          <div className="card-subtext">
            Send WhatsApp reminders to students with unpaid fees and fines for
            the selected month or all months.
          </div>

          <form onSubmit={handleSendWhatsapp} style={{ marginTop: 12 }}>
            <div className="filters-row">
              <div className="filter-group">
                <label className="filter-label">Apply to</label>
                <select
                  className="filter-select"
                  value={waScope}
                  onChange={(e) => setWaScope(e.target.value)}
                >
                  <option value="ALL">All students with pending fees</option>
                  <option value="STUDENT">Specific student</option>
                </select>
              </div>

              {waScope === "STUDENT" && (
                <div className="filter-group">
                  <label className="filter-label">Student</label>
                  <select
                    className="filter-select"
                    value={waStudentId}
                    onChange={(e) => setWaStudentId(e.target.value)}
                  >
                    <option value="">Select student</option>
                    {studentOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!waAllMonths && (
                <>
                  <div className="filter-group">
                    <label className="filter-label">Month</label>
                    <select
                      className="filter-select"
                      value={waMonth}
                      onChange={(e) => setWaMonth(Number(e.target.value))}
                    >
                      {monthOptions.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Year</label>
                    <input
                      type="number"
                      className="filter-input"
                      value={waYear}
                      onChange={(e) => setWaYear(Number(e.target.value))}
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={waAllMonths}
                  onChange={(e) => setWaAllMonths(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Consider <strong>all months</strong> with pending fees
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={waLoading}
              >
                {waLoading ? "Sending…" : "Send WhatsApp Reminders"}
              </button>
            </div>

            {waMessage && (
              <p style={{ marginTop: 8, fontSize: "0.85rem" }}>{waMessage}</p>
            )}
          </form>
        </div>

        {/* 4) Fine waiver */}
        <div className="card">
          <div className="card-title">4. Fine Waiver</div>
          <div className="card-subtext">
            Waive full or partial late fees for all students or a specific
            student, for a single month or all months.
          </div>

          <form onSubmit={handleFineWaiver} style={{ marginTop: 12 }}>
            <div className="filters-row">
              {/* Scope */}
              <div className="filter-group">
                <label className="filter-label">Apply to</label>
                <select
                  className="filter-select"
                  value={wvScope}
                  onChange={(e) => setWvScope(e.target.value)}
                >
                  <option value="ALL">All students</option>
                  <option value="STUDENT">Specific student</option>
                </select>
              </div>

              {/* Student */}
              {wvScope === "STUDENT" && (
                <div className="filter-group">
                  <label className="filter-label">Student</label>
                  <select
                    className="filter-select"
                    value={wvStudentId}
                    onChange={(e) => setWvStudentId(e.target.value)}
                  >
                    <option value="">Select student</option>
                    {studentOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Month / year */}
              {!wvAllMonths && (
                <>
                  <div className="filter-group">
                    <label className="filter-label">Month</label>
                    <select
                      className="filter-select"
                      value={wvMonth}
                      onChange={(e) => setWvMonth(Number(e.target.value))}
                    >
                      {monthOptions.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Year</label>
                    <input
                      type="number"
                      className="filter-input"
                      value={wvYear}
                      onChange={(e) => setWvYear(Number(e.target.value))}
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={wvAllMonths}
                  onChange={(e) => setWvAllMonths(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Apply to <strong>all months</strong> (ignore selected month/year)
              </label>
            </div>

            <div
              className="filters-row"
              style={{ marginTop: 12, alignItems: "flex-end" }}
            >
              <div className="filter-group">
                <label className="filter-label">Waiver type</label>
                <select
                  className="filter-select"
                  value={wvKind}
                  onChange={(e) => setWvKind(e.target.value)}
                >
                  <option value="FULL">Full fine waiver</option>
                  <option value="PARTIAL">
                    Partial waiver (per fee record)
                  </option>
                </select>
              </div>

              {wvKind === "PARTIAL" && (
                <div className="filter-group">
                  <label className="filter-label">Partial amount</label>
                  <input
                    type="number"
                    min="0"
                    className="filter-input"
                    value={wvAmount}
                    onChange={(e) => setWvAmount(e.target.value)}
                    placeholder="e.g. 500"
                  />
                  <div
                    style={{
                      fontSize: "0.75rem",
                      marginTop: 2,
                      opacity: 0.8,
                    }}
                  >
                    This amount will be deducted from{" "}
                    <strong>each</strong> selected fee&apos;s fine.
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={wvLoading}
              >
                {wvLoading ? "Applying…" : "Apply Fine Waiver"}
              </button>
            </div>

            {wvMessage && (
              <p style={{ marginTop: 8, fontSize: "0.85rem" }}>{wvMessage}</p>
            )}
          </form>
        </div>
      </div>
    </AppShell>
  );
}
