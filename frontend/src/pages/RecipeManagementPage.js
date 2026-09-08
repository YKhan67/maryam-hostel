// src/pages/RecipeManagementPage.js
import React, { useCallback, useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import { saveAs } from "file-saver";

export default function RecipeManagementPage() {
  const { user } = useContext(AuthContext);
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState({});
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [showEditIngredient, setShowEditIngredient] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);

  const isManager = user?.role === "HOSTEL_MANAGER" || user?.role === "SUPER_ADMIN";

  const [ingredientForm, setIngredientForm] = useState({
    item: "",
    quantity_required: "",
    unit: "kg",
    estimated_cost: "",
    waste_factor: 0.015,
  });

  const loadAllRecipes = useCallback(async (mealsList) => {
    try {
      const recipePromises = mealsList.map(meal =>
        api.get(`food/meals/${meal.id}/recipes/`)
      );
      const recipeResponses = await Promise.all(recipePromises);
      const allRecipes = {};
      recipeResponses.forEach((res, index) => {
        allRecipes[mealsList[index].id] = res.data || [];
      });
      setRecipes(allRecipes);
    } catch (err) {
      console.error("Error loading recipes:", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mealRes, itemRes] = await Promise.all([
        api.get("food/meals/"),
        api.get("items/"),
      ]);
      setMeals(mealRes.data.results || mealRes.data || []);
      setItems(itemRes.data.results || itemRes.data || []);
      
      await loadAllRecipes(mealRes.data.results || mealRes.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, [loadAllRecipes]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function loadRecipesForMeal(mealId) {
    try {
      const res = await api.get(`food/meals/${mealId}/recipes/`);
      setRecipes(prev => ({ ...prev, [mealId]: res.data || [] }));
    } catch (err) {
      console.error("Error loading recipes:", err);
    }
  }

  async function handleAddIngredient(e) {
    e.preventDefault();
    try {
      await api.post(`food/meals/${selectedMeal.id}/recipes/`, ingredientForm);
      alert("✅ Ingredient added successfully!");
      setShowAddIngredient(false);
      setIngredientForm({ item: "", quantity_required: "", unit: "kg", estimated_cost: "", waste_factor: 0.015 });
      loadRecipesForMeal(selectedMeal.id);
    } catch (err) {
      console.error("Error adding ingredient:", err);
      alert("Failed to add ingredient. Please try again.");
    }
  }

  async function handleUpdateIngredient(e) {
    e.preventDefault();
    try {
      await api.patch(`food/meals/${selectedMeal.id}/recipes/${editingRecipe.id}/`, ingredientForm);
      alert("✅ Ingredient updated successfully!");
      setShowEditIngredient(false);
      setEditingRecipe(null);
      setIngredientForm({ item: "", quantity_required: "", unit: "kg", estimated_cost: "", waste_factor: 0.015 });
      loadRecipesForMeal(selectedMeal.id);
    } catch (err) {
      console.error("Error updating ingredient:", err);
      alert("Failed to update ingredient. Please try again.");
    }
  }

  async function handleDeleteIngredient(mealId, recipeId) {
    if (!window.confirm("Are you sure you want to remove this ingredient?")) return;
    try {
      await api.delete(`food/meals/${mealId}/recipes/${recipeId}/`);
      alert("✅ Ingredient removed successfully!");
      loadRecipesForMeal(mealId);
    } catch (err) {
      console.error("Error deleting ingredient:", err);
      alert("Failed to delete ingredient.");
    }
  }

  const handleEditClick = (recipe) => {
    setEditingRecipe(recipe);
    setIngredientForm({
      item: recipe.item,
      quantity_required: recipe.quantity_required,
      unit: recipe.unit || "kg",
      estimated_cost: recipe.estimated_cost || "",
      waste_factor: recipe.waste_factor || 0.015,
    });
    setShowEditIngredient(true);
  };

  async function downloadTemplate() {
    try {
      const response = await api.get("food/recipes/export-template/", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "meal_recipe_template.xlsx");
    } catch (err) {
      console.error("Error downloading template:", err);
      alert("Failed to download template.");
    }
  }

  async function handleImportExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Please upload an Excel file (.xlsx or .xls)");
      e.target.value = "";
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    if (selectedMeal) {
      formData.append("meal_id", selectedMeal.id);
    }

    try {
      const response = await api.post("food/recipes/import-excel/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const data = response.data;
      let message = `✅ Import completed!\n\n`;
      message += `🍽️ Recipes created: ${data.created || 0}\n`;
      message += `🔄 Recipes updated: ${data.updated || 0}\n`;
      
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
      setShowImportModal(false);
      if (selectedMeal) {
        loadRecipesForMeal(selectedMeal.id);
      }
    } catch (err) {
      console.error("Error importing Excel:", err);
      alert("Failed to import Excel file. Please check the format.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  const getItemName = (itemId) => {
    const item = items.find(i => i.id === parseInt(itemId));
    return item ? item.name : "Unknown Item";
  };

  if (loading) {
    return (
      <div className="page management-page">
        <div className="card" style={{ textAlign: "center", padding: "60px" }}>
          <p>Loading Recipe Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page management-page">
      {/* Header */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ margin: 0 }}>📋 Recipe Management</h2>
            <p className="card-subtext">Manage ingredients for each meal</p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={downloadTemplate} className="btn btn-soft">
              📥 Download Template
            </button>
            <button
              onClick={() => {
              if (!selectedMeal) {
                alert("Select a recipe first.");
                return;
              }
              setShowImportModal(true);
              }}
              className="btn btn-primary"
              disabled={!isManager}
            >
              📤 Import Excel
            </button>
          </div>
        </div>
      </div>

      {/* Meal Selector */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="filter-group" style={{ flex: 1 }}>
            <label className="filter-label">Select Meal</label>
            <select
              className="filter-select"
              value={selectedMeal?.id || ""}
              onChange={(e) => {
                const meal = meals.find(m => m.id === parseInt(e.target.value));
                setSelectedMeal(meal);
                if (meal) loadRecipesForMeal(meal.id);
              }}
            >
              <option value="">Select a meal</option>
              {meals.map((meal) => (
                <option key={meal.id} value={meal.id}>
                  {meal.name} ({meal.category_name || meal.category})
                </option>
              ))}
            </select>
          </div>
          {selectedMeal && isManager && (
            <button 
              onClick={() => setShowAddIngredient(true)} 
              className="btn btn-success"
              style={{ marginTop: "20px" }}
            >
              ➕ Add Ingredient
            </button>
          )}
        </div>
      </div>

      {/* Recipes Table */}
      {selectedMeal ? (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>
              Ingredients for: <span style={{ color: "var(--brand-gold)" }}>{selectedMeal.name}</span>
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Total Items: {recipes[selectedMeal.id]?.length || 0}
            </span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Est. Cost</th>
                  <th>Waste Factor</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(recipes[selectedMeal.id] || []).length > 0 ? (
                  (recipes[selectedMeal.id] || []).map((recipe) => (
                    <tr key={recipe.id}>
                      <td style={{ fontWeight: 600 }}>{getItemName(recipe.item)}</td>
                      <td>{recipe.quantity_required}</td>
                      <td>{recipe.unit || "kg"}</td>
                      <td>Rs {parseFloat(recipe.estimated_cost || 0).toFixed(2)}</td>
                      <td>{(parseFloat(recipe.waste_factor || 0) * 100).toFixed(1)}%</td>
                      <td style={{ textAlign: "right" }}>
                        {isManager && (
                          <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                            <button 
                              onClick={() => handleEditClick(recipe)} 
                              className="btn btn-soft" 
                              style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteIngredient(selectedMeal.id, recipe.id)} 
                              className="btn btn-soft" 
                              style={{ fontSize: "0.7rem", padding: "4px 8px", background: "#fee2e2", color: "#dc2626" }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      No ingredients added for this meal yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "60px" }}>
          <p style={{ fontSize: "1.1rem", color: "var(--text-muted)" }}>
            Please select a meal to manage its ingredients.
          </p>
        </div>
      )}

      {/* Add Ingredient Modal */}
      {showAddIngredient && selectedMeal && (
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
            <h3 style={{ marginBottom: "16px" }}>
              Add Ingredient to "{selectedMeal.name}"
            </h3>
            <form onSubmit={handleAddIngredient}>
              <div className="form-group">
                <label className="form-label">Ingredient</label>
                <select
                  className="form-input"
                  required
                  value={ingredientForm.item}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, item: e.target.value })}
                >
                  <option value="">Select Ingredient</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit_name || "unit"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity Required</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  required
                  value={ingredientForm.quantity_required}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, quantity_required: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select
                  className="form-input"
                  value={ingredientForm.unit}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="pieces">pieces</option>
                  <option value="liters">liters</option>
                  <option value="ml">ml</option>
                  <option value="pack">pack</option>
                  <option value="dozen">dozen</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Cost (per unit)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={ingredientForm.estimated_cost}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, estimated_cost: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Waste Factor (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={parseFloat(ingredientForm.waste_factor) * 100}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, waste_factor: parseFloat(e.target.value) / 100 || 0 })}
                />
                <small style={{ color: "var(--text-muted)" }}>e.g., 1.5% means you need 1.5% extra for waste</small>
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Add Ingredient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddIngredient(false);
                    setIngredientForm({ item: "", quantity_required: "", unit: "kg", estimated_cost: "", waste_factor: 0.015 });
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

      {/* Edit Ingredient Modal */}
      {showEditIngredient && editingRecipe && (
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
            <h3 style={{ marginBottom: "16px" }}>Edit Ingredient</h3>
            <form onSubmit={handleUpdateIngredient}>
              <div className="form-group">
                <label className="form-label">Ingredient</label>
                <select
                  className="form-input"
                  required
                  value={ingredientForm.item}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, item: e.target.value })}
                >
                  <option value="">Select Ingredient</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit_name || "unit"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity Required</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  required
                  value={ingredientForm.quantity_required}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, quantity_required: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select
                  className="form-input"
                  value={ingredientForm.unit}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="pieces">pieces</option>
                  <option value="liters">liters</option>
                  <option value="ml">ml</option>
                  <option value="pack">pack</option>
                  <option value="dozen">dozen</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Cost (per unit)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={ingredientForm.estimated_cost}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, estimated_cost: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Waste Factor (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={parseFloat(ingredientForm.waste_factor) * 100}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, waste_factor: parseFloat(e.target.value) / 100 || 0 })}
                />
                <small style={{ color: "var(--text-muted)" }}>e.g., 1.5% means you need 1.5% extra for waste</small>
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Update Ingredient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditIngredient(false);
                    setEditingRecipe(null);
                    setIngredientForm({ item: "", quantity_required: "", unit: "kg", estimated_cost: "", waste_factor: 0.015 });
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

      {/* Import Modal */}
      {showImportModal && (
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
            <h3 style={{ marginBottom: "16px" }}>📤 Import Recipes</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Upload an Excel file with ingredients for <strong>{selectedMeal?.name}</strong>
            </p>
            <div style={{ 
              padding: "20px", 
              border: "2px dashed #e2e8f0", 
              borderRadius: "8px", 
              textAlign: "center",
              marginBottom: "16px"
            }}>
              <label style={{ cursor: "pointer", display: "block" }}>
                <div style={{ fontSize: "3rem", marginBottom: "8px" }}>📄</div>
                <div style={{ fontWeight: 600 }}>Click to upload Excel file</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>.xlsx or .xls</div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  hidden
                  onChange={handleImportExcel}
                  disabled={importing}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={downloadTemplate}
                className="btn btn-soft"
                style={{ flex: 1 }}
                disabled={importing}
              >
                📥 Download Template
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="btn btn-soft"
                style={{ flex: 1 }}
                disabled={importing}
              >
                Cancel
              </button>
            </div>
            {importing && (
              <div style={{ marginTop: "12px", textAlign: "center", color: "var(--brand-gold)" }}>
                Importing...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}