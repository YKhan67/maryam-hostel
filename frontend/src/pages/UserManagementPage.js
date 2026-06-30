// src/pages/UserManagementPage.js
import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../api";

const ROLE_OPTIONS = [
  "STUDENT",
  "HOSTEL_MANAGER",
  "CITY_MANAGER",
  "STAFF",
  "SUPER_ADMIN",
];

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "STUDENT",
    password: "",
  });

  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoadingUsers(true);
    setError(null);
    try {
      const res = await api.get("/users/");
      setUsers(res.data);
    } catch (err) {
      console.error("Error loading users:", err);
      setError("Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setCreateMessage("");
    try {
      const payload = { ...form };
      await api.post("/users/", payload);
      setCreateMessage("✅ User created successfully.");
      // clear form
      setForm({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        role: "STUDENT",
        password: "",
      });
      // reload users list
      fetchUsers();
    } catch (err) {
      console.error("Error creating user:", err);
      if (err.response && err.response.data) {
        setCreateMessage(
          "❌ Failed to create user: " + JSON.stringify(err.response.data)
        );
      } else {
        setCreateMessage("❌ Failed to create user.");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell subtitle="User Management">
      {/* Create user card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Create New User</div>
          <div className="card-subtitle">
            Create login accounts for students and management. Students will
            automatically get a Student Profile in the system.
          </div>
        </div>

        <form
          onSubmit={handleCreate}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label className="form-label">Username</label>
            <input
              name="username"
              className="form-input"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="form-label">First Name</label>
            <input
              name="first_name"
              className="form-input"
              value={form.first_name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="form-label">Last Name</label>
            <input
              name="last_name"
              className="form-input"
              value={form.last_name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="form-label">Email</label>
            <input
              name="email"
              type="email"
              className="form-input"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="form-label">Role</label>
            <select
              name="role"
              className="form-input"
              value={form.role}
              onChange={handleChange}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Password</label>
            <input
              name="password"
              type="password"
              className="form-input"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-start",
            }}
          >
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>

        {createMessage && (
          <div style={{ fontSize: "0.85rem", marginBottom: 4 }}>
            {createMessage}
          </div>
        )}
      </div>

      {/* Existing users card */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title">Existing Users</div>
          <div className="card-subtitle">
            Users with access to Maryam Hostel system.
          </div>
        </div>

        {loadingUsers ? (
          <div>Loading users…</div>
        ) : error ? (
          <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
            {error}
          </div>
        ) : users.length === 0 ? (
          <div>No users found.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.role}</td>
                    <td>
                      {(u.first_name || "") + " " + (u.last_name || "")}
                    </td>
                    <td>{u.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
