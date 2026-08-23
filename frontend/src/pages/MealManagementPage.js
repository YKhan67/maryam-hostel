// src/pages/MealManagementPage.js
import React, { useEffect, useState } from "react";
import api from "../api";

export default function MealManagementPage() {
  const [meals, setMeals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dailyMenus, setDailyMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState('LUNCH');

  const [mealForm, setMealForm] = useState({
    name: '',
    description: '',
    category: '',
    dietary_tags: '',
    preparation_time: 30
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mealRes, catRes, menuRes] = await Promise.all([
        api.get("food/meals/"),
        api.get("food/categories/"),
        api.get("food/daily-menu/")
      ]);
      setMeals(mealRes.data.results || mealRes.data || []);
      setCategories(catRes.data.results || catRes.data || []);
      setDailyMenus(menuRes.data.results || menuRes.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMeal(e) {
    e.preventDefault();
    try {
      await api.post("food/meals/", mealForm);
      alert("✅ Meal created successfully!");
      setShowAddMeal(false);
      setMealForm({ name: '', description: '', category: '', dietary_tags: '', preparation_time: 30 });
      loadData();
    } catch (err) {
      alert("Failed to create meal. Please try again.");
    }
  }

  async function handleScheduleMenu(e) {
    e.preventDefault();
    try {
      await api.post("food/daily-menu/", {
        hostel: 1, // Default hostel ID - should be dynamic
        date: selectedDate,
        meal_type: selectedMealType,
        meal: e.target.meal.value
      });
      alert("✅ Menu scheduled successfully!");
      setShowScheduleMenu(false);
      loadData();
    } catch (err) {
      alert("Failed to schedule menu.");
    }
  }

  async function generateGroceryList() {
    if (!window.confirm("Generate grocery requirements for the selected period?")) return;
    
    try {
      const response = await api.post("food/grocery/generate/", {
        hostel: 1, // Default hostel ID
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      alert(`✅ Generated ${response.data.items_created} grocery items!`);
      loadData();
    } catch (err) {
      alert("Failed to generate grocery list.");
    }
  }

  if (loading) {
    return (
      <div className="page management-page">
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <p>Loading Meal Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page management-page">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0 }}>🍽️ Meal Management</h2>
            <p className="card-subtext">Manage meals, recipes, and daily menus</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>All Meals</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Dietary Tags</th>
                <th>Prep Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {meals.map(meal => (
                <tr key={meal.id}>
                  <td style={{ fontWeight: 700 }}>{meal.name}</td>
                  <td>{meal.category_name || meal.category}</td>
                  <td>{meal.dietary_tags || '—'}</td>
                  <td>{meal.preparation_time} min</td>
                  <td>
                    <span className={`badge ${meal.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {meal.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-soft" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))}
              {meals.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
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
        <h3 style={{ marginBottom: '16px' }}>Today's Schedule</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Meal Type</th>
                <th>Meal</th>
                <th>Special Notes</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dailyMenus.filter(m => m.date === new Date().toISOString().split('T')[0]).map(menu => (
                <tr key={menu.id}>
                  <td>{menu.meal_type_display || menu.meal_type}</td>
                  <td>{menu.meal_details?.name || menu.meal_name}</td>
                  <td>{menu.special_note || '—'}</td>
                  <td>
                    <span className={`badge ${menu.is_featured ? 'badge-warning' : 'badge-soft'}`}>
                      {menu.is_featured ? '⭐ Featured' : 'Regular'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-soft" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))}
              {dailyMenus.filter(m => m.date === new Date().toISOString().split('T')[0]).length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    No meals scheduled for today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Meal Modal */}
      {showAddMeal && (
        <div className="modal-overlay" style={{
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
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '32px' }}>
            <h3 style={{ marginBottom: '16px' }}>Add New Meal</h3>
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
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
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
                  onChange={(e) => setMealForm({ ...mealForm, preparation_time: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Add Meal
                </button>
                <button type="button" onClick={() => setShowAddMeal(false)} className="btn btn-soft" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Menu Modal */}
      {showScheduleMenu && (
        <div className="modal-overlay" style={{
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
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '32px' }}>
            <h3 style={{ marginBottom: '16px' }}>Schedule Meal</h3>
            <form onSubmit={handleScheduleMenu}>
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
                <select
                  className="form-input"
                  name="meal"
                  required
                >
                  <option value="">Select a meal</option>
                  {meals.map(meal => (
                    <option key={meal.id} value={meal.id}>
                      {meal.name} ({meal.category_name || meal.category})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Schedule
                </button>
                <button type="button" onClick={() => setShowScheduleMenu(false)} className="btn btn-soft" style={{ flex: 1 }}>
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