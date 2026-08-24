// src/pages/MealManagementPage.js
import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import { saveAs } from "file-saver";

export default function MealManagementPage() {
  const { user } = useContext(AuthContext);
  const [meals, setMeals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dailyMenus, setDailyMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showEditMeal, setShowEditMeal] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMealType, setSelectedMealType] = useState("LUNCH");
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState("");

  const [mealForm, setMealForm] = useState({
    name: "",
    description: "",
    category: "",
    dietary_tags: "",
    preparation_time: 30,
  });

  // Edit meal form state
  const [editMealForm, setEditMealForm] = useState({
    name: "",
    description: "",
    category: "",
    dietary_tags: "",
    preparation_time: 30,
    is_active: true,
  });

  // Edit menu form state
  const [editForm, setEditForm] = useState({
    hostel: "",
    date: "",
    meal_type: "",
    meal: "",
    is_featured: false,
    special_note: "",
  });

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    loadData();
    loadHostels();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mealRes, catRes, menuRes] = await Promise.all([
        api.get("food/meals/"),
        api.get("food/categories/"),
        api.get("food/daily-menu/"),
      ]);
      
      setMeals(mealRes.data.results || mealRes.data || []);
      setCategories(catRes.data.results || catRes.data || []);
      
      let menus = menuRes.data;
      if (menus && menus.results) {
        menus = menus.results;
      }
      if (!Array.isArray(menus)) {
        menus = [];
      }
      
      setDailyMenus(menus);
      
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadHostels() {
    try {
      const res = await api.get("hostels/");
      setHostels(res.data.results || res.data || []);
      if (res.data.length > 0) {
        setSelectedHostel(res.data[0].id);
      }
    } catch (err) {
      console.error("Error loading hostels:", err);
    }
  }

  // Handle Edit Meal Click
  const handleEditMealClick = (meal) => {
    setEditingMeal(meal);
    setEditMealForm({
      name: meal.name || "",
      description: meal.description || "",
      category: meal.category || "",
      dietary_tags: meal.dietary_tags || "",
      preparation_time: meal.preparation_time || 30,
      is_active: meal.is_active !== false,
    });
    setShowEditMeal(true);
  };

  // Handle Edit Meal Submit
  const handleEditMealSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`food/meals/${editingMeal.id}/`, editMealForm);
      alert("✅ Meal updated successfully!");
      setShowEditMeal(false);
      setEditingMeal(null);
      loadData();
    } catch (err) {
      console.error("Error updating meal:", err);
      alert("Failed to update meal. Please try again.");
    }
  };

  // Handle Delete Meal
  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm("Are you sure you want to delete this meal? This will also remove it from all schedules.")) return;
    try {
      await api.delete(`food/meals/${mealId}/`);
      alert("✅ Meal deleted successfully!");
      loadData();
    } catch (err) {
      console.error("Error deleting meal:", err);
      alert("Failed to delete meal. Please try again.");
    }
  };

  // Handle Edit Menu Click
  const handleEditMenuClick = (menu) => {
    setEditingMenu(menu);
    setEditForm({
      hostel: menu.hostel || "",
      date: menu.date || "",
      meal_type: menu.meal_type || "LUNCH",
      meal: menu.meal || "",
      is_featured: menu.is_featured || false,
      special_note: menu.special_note || "",
    });
    setShowEditMenu(true);
  };

  // Handle Edit Menu Submit
  const handleEditMenuSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`food/daily-menu/${editingMenu.id}/`, editForm);
      alert("✅ Menu updated successfully!");
      setShowEditMenu(false);
      setEditingMenu(null);
      loadData();
    } catch (err) {
      console.error("Error updating menu:", err);
      alert("Failed to update menu. Please try again.");
    }
  };

  async function handleAddMeal(e) {
    e.preventDefault();
    try {
      await api.post("food/meals/", mealForm);
      alert("✅ Meal created successfully!");
      setShowAddMeal(false);
      setMealForm({ name: "", description: "", category: "", dietary_tags: "", preparation_time: 30 });
      loadData();
    } catch (err) {
      console.error("Error creating meal:", err);
      alert("Failed to create meal. Please try again.");
    }
  }

  async function handleScheduleMenu(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await api.post("food/daily-menu/", {
        hostel: selectedHostel,
        date: selectedDate,
        meal_type: selectedMealType,
        meal: formData.get("meal"),
      });
      alert("✅ Menu scheduled successfully!");
      setShowScheduleMenu(false);
      loadData();
    } catch (err) {
      console.error("Error scheduling menu:", err);
      alert("Failed to schedule menu.");
    }
  }

  async function handleDeleteMenu(menuId) {
    if (!window.confirm("Are you sure you want to delete this scheduled menu?")) return;
    try {
      await api.delete(`food/daily-menu/${menuId}/`);
      alert("✅ Menu deleted successfully!");
      loadData();
    } catch (err) {
      console.error("Error deleting menu:", err);
      alert("Failed to delete menu.");
    }
  }

  async function generateGroceryList() {
    if (!window.confirm("Generate grocery requirements for the selected period?")) return;
    if (!selectedHostel) {
      alert("Please select a hostel first.");
      return;
    }
    try {
      const response = await api.post("food/grocery/generate/", {
        hostel: selectedHostel,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
      alert(`✅ Generated ${response.data.items_created} grocery items!`);
      loadData();
    } catch (err) {
      console.error("Error generating grocery list:", err);
      alert("Failed to generate grocery list.");
    }
  }

  // Excel Export - Download Template
  async function downloadTemplate() {
    try {
      const response = await api.get("food/export-template/", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "meal_menu_template.xlsx");
    } catch (err) {
      console.error("Error downloading template:", err);
      alert("Failed to download template. Please try again.");
    }
  }

  // Excel Import
  async function handleImportExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Please upload an Excel file (.xlsx or .xls)");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await api.post("food/import-excel/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = response.data;
      let message = `✅ Import completed!\n\n`;
      message += `📊 Categories created: ${data.categories_created || 0}\n`;
      message += `🍽️ Meals created: ${data.meals_created || 0}\n`;
      message += `📅 Schedules created: ${data.schedules_created || 0}\n`;

      if (data.errors && data.errors.length > 0) {
        message += `\n⚠️ Errors: ${data.errors.length}\n`;
        data.errors.slice(0, 5).forEach((err) => {
          message += `  - ${err}\n`;
        });
        if (data.errors.length > 5) {
          message += `  ... and ${data.errors.length - 5} more errors`;
        }
      }

      alert(message);
      loadData();
    } catch (err) {
      console.error("Error importing Excel:", err);
      alert("Failed to import Excel file. Please check the format and try again.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  // Get today's date string using local timezone
  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();

  // Filter today's menus
  const todayMenus = dailyMenus.filter((m) => {
    const menuDate = m.date;
    if (typeof menuDate === 'string') {
      return menuDate === todayStr;
    }
    if (menuDate instanceof Date) {
      const year = menuDate.getFullYear();
      const month = String(menuDate.getMonth() + 1).padStart(2, "0");
      const day = String(menuDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}` === todayStr;
    }
    return false;
  });

  if (loading)
    return (
      <div className="page management-page">
        <div className="card" style={{ textAlign: "center", padding: "60px" }}>
          <p>Loading Meal Management...</p>
        </div>
      </div>
    );

  return (
    <div className="page management-page">
      {/* Header */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>🍽️ Meal Management</h2>
            <p className="card-subtext">Manage meals, recipes, and daily menus</p>
            {isSuperAdmin && (
              <span className="badge badge-success" style={{ marginTop: "4px" }}>
                👑 Super Admin - Viewing All Hostels
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={downloadTemplate} className="btn btn-soft">
              📥 Download Template
            </button>
            <label className="btn btn-primary" style={{ cursor: "pointer" }}>
              📤 Import Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={handleImportExcel}
              />
            </label>
            <button onClick={() => setShowAddMeal(true)} className="btn btn-primary">
              ➕ Add Meal
            </button>
            <button onClick={() => setShowScheduleMenu(true)} className="btn btn-success">
              📅 Schedule Menu
            </button>
            <button onClick={generateGroceryList} className="btn btn-soft">
              🛒 Generate Grocery List
            </button>
          </div>
        </div>
      </div>

      {/* Meals List */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <h3 style={{ marginBottom: "16px" }}>All Meals</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Dietary Tags</th>
                <th>Prep Time</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {meals.map((meal) => (
                <tr key={meal.id}>
                  <td style={{ fontWeight: 700 }}>{meal.name}</td>
                  <td>{meal.category_name || meal.category}</td>
                  <td>{meal.dietary_tags || "—"}</td>
                  <td>{meal.preparation_time} min</td>
                  <td>
                    <span className={`badge ${meal.is_active ? "badge-success" : "badge-danger"}`}>
                      {meal.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                      <button 
                        onClick={() => handleEditMealClick(meal)} 
                        className="btn btn-soft" 
                        style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteMeal(meal.id)} 
                        className="btn btn-soft" 
                        style={{ fontSize: "0.7rem", padding: "4px 8px", background: "#fee2e2", color: "#dc2626" }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {meals.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
                    No meals created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Today's Scheduled Menu */}
      <div className="card">
        <h3 style={{ marginBottom: "16px" }}>Today's Schedule</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Hostel</th>
                <th>Meal Type</th>
                <th>Meal</th>
                <th>Special Notes</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {todayMenus.length > 0 ? (
                todayMenus.map((menu) => (
                  <tr key={menu.id}>
                    <td>{menu.hostel_name || "N/A"}</td>
                    <td>{menu.meal_type_display || menu.meal_type}</td>
                    <td>{menu.meal_details?.name || menu.meal_name}</td>
                    <td>{menu.special_note || "—"}</td>
                    <td>
                      <span className={`badge ${menu.is_featured ? "badge-warning" : "badge-soft"}`}>
                        {menu.is_featured ? "⭐ Featured" : "Regular"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                        <button 
                          onClick={() => handleEditMenuClick(menu)} 
                          className="btn btn-soft" 
                          style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteMenu(menu.id)} 
                          className="btn btn-soft" 
                          style={{ fontSize: "0.7rem", padding: "4px 8px", background: "#fee2e2", color: "#dc2626" }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
                    No meals scheduled for today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Meal Modal */}
      {showEditMeal && editingMeal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: "500px", width: "90%", padding: "32px" }}>
            <h3 style={{ marginBottom: "16px" }}>Edit Meal</h3>
            <form onSubmit={handleEditMealSubmit}>
              <div className="form-group">
                <label className="form-label">Meal Name</label>
                <input
                  className="form-input"
                  required
                  value={editMealForm.name}
                  onChange={(e) => setEditMealForm({ ...editMealForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={editMealForm.description}
                  onChange={(e) => setEditMealForm({ ...editMealForm, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  required
                  value={editMealForm.category}
                  onChange={(e) => setEditMealForm({ ...editMealForm, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dietary Tags</label>
                <input
                  className="form-input"
                  placeholder="e.g., Vegetarian, Gluten-Free"
                  value={editMealForm.dietary_tags}
                  onChange={(e) => setEditMealForm({ ...editMealForm, dietary_tags: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Preparation Time (minutes)</label>
                <input
                  className="form-input"
                  type="number"
                  value={editMealForm.preparation_time}
                  onChange={(e) =>
                    setEditMealForm({ ...editMealForm, preparation_time: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label className="form-label" style={{ margin: 0 }}>Active</label>
                <input
                  type="checkbox"
                  checked={editMealForm.is_active}
                  onChange={(e) => setEditMealForm({ ...editMealForm, is_active: e.target.checked })}
                />
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Update Meal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditMeal(false);
                    setEditingMeal(null);
                  }}
                  className="btn btn-soft"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Menu Modal */}
      {showEditMenu && editingMenu && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: "500px", width: "90%", padding: "32px" }}>
            <h3 style={{ marginBottom: "16px" }}>Edit Scheduled Meal</h3>
            <form onSubmit={handleEditMenuSubmit}>
              <div className="form-group">
                <label className="form-label">Hostel</label>
                <select
                  className="form-input"
                  required
                  value={editForm.hostel}
                  onChange={(e) => setEditForm({ ...editForm, hostel: e.target.value })}
                >
                  <option value="">Select Hostel</option>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  required
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Meal Type</label>
                <select
                  className="form-input"
                  required
                  value={editForm.meal_type}
                  onChange={(e) => setEditForm({ ...editForm, meal_type: e.target.value })}
                >
                  <option value="BREAKFAST">🌅 Breakfast</option>
                  <option value="BRUNCH">🌤️ Brunch</option>
                  <option value="LUNCH">☀️ Lunch</option>
                  <option value="SNACKS">🍪 Snacks</option>
                  <option value="DINNER">🌙 Dinner</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Meal</label>
                <select
                  className="form-input"
                  required
                  value={editForm.meal}
                  onChange={(e) => setEditForm({ ...editForm, meal: e.target.value })}
                >
                  <option value="">Select Meal</option>
                  {meals.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Special Note</label>
                <input
                  className="form-input"
                  value={editForm.special_note}
                  onChange={(e) => setEditForm({ ...editForm, special_note: e.target.value })}
                  placeholder="Special notes about this meal"
                />
              </div>
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label className="form-label" style={{ margin: 0 }}>Featured Meal</label>
                <input
                  type="checkbox"
                  checked={editForm.is_featured}
                  onChange={(e) => setEditForm({ ...editForm, is_featured: e.target.checked })}
                />
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Update Schedule
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditMenu(false);
                    setEditingMenu(null);
                  }}
                  className="btn btn-soft"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Meal Modal */}
      {showAddMeal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: "500px", width: "90%", padding: "32px" }}>
            <h3 style={{ marginBottom: "16px" }}>Add New Meal</h3>
            <form onSubmit={handleAddMeal}>
              <div className="form-group">
                <label className="form-label">Meal Name</label>
                <input
                  className="form-input"
                  required
                  value={mealForm.name}
                  onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={mealForm.description}
                  onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  required
                  value={mealForm.category}
                  onChange={(e) => setMealForm({ ...mealForm, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dietary Tags</label>
                <input
                  className="form-input"
                  placeholder="e.g., Vegetarian, Gluten-Free"
                  value={mealForm.dietary_tags}
                  onChange={(e) => setMealForm({ ...mealForm, dietary_tags: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Preparation Time (minutes)</label>
                <input
                  className="form-input"
                  type="number"
                  value={mealForm.preparation_time}
                  onChange={(e) =>
                    setMealForm({ ...mealForm, preparation_time: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Add Meal
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMeal(false)}
                  className="btn btn-soft"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Menu Modal */}
      {showScheduleMenu && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: "450px", width: "90%", padding: "32px" }}>
            <h3 style={{ marginBottom: "16px" }}>Schedule Meal</h3>
            <form onSubmit={handleScheduleMenu}>
              <div className="form-group">
                <label className="form-label">Hostel</label>
                <select
                  className="form-input"
                  required
                  value={selectedHostel}
                  onChange={(e) => setSelectedHostel(e.target.value)}
                >
                  <option value="">Select Hostel</option>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Meal Type</label>
                <select
                  className="form-input"
                  required
                  value={selectedMealType}
                  onChange={(e) => setSelectedMealType(e.target.value)}
                >
                  <option value="BREAKFAST">🌅 Breakfast</option>
                  <option value="BRUNCH">🌤️ Brunch</option>
                  <option value="LUNCH">☀️ Lunch</option>
                  <option value="SNACKS">🍪 Snacks</option>
                  <option value="DINNER">🌙 Dinner</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Select Meal</label>
                <select className="form-input" name="meal" required>
                  <option value="">Select a meal</option>
                  {meals.map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.name} ({meal.category_name || meal.category})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleMenu(false)}
                  className="btn btn-soft"
                  style={{ flex: 1 }}
                >
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