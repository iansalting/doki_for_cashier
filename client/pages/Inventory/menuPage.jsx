import { useEffect, useState } from "react";
import axios from "axios";
import "./MenuPage.css";

export default function MenuPage() {
  const [menus, setMenus] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    ingredients: [],
  });

  const [ingredientSelection, setIngredientSelection] = useState({
    selectedIngredient: "",
    quantity: "",
  });

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    menuId: null,
    menuName: "",
  });
  const [authModal, setAuthModal] = useState({
    show: false,
    password: "",
    loading: false,
  });
  const [deleteLoading, setDeleteLoading] = useState(null);

  useEffect(() => {
    fetchMenus();
    fetchIngredients();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, []);
  const token = localStorage.getItem("token");

  const fetchMenus = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/menu/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMenus(response.data.data);
    } catch (err) {
      setError("Failed to load menus");
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch ingredients
  const fetchIngredients = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/ingredients/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setIngredients(response.data.data || response.data);
    } catch (err) {
      console.error("Failed to load ingredients:", err);
      // You might want to show a non-blocking error for ingredients
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleIngredientSelectionChange = (e) => {
    setIngredientSelection({
      ...ingredientSelection,
      [e.target.name]: e.target.value,
    });
  };

  const addSelectedIngredient = () => {
    if (
      !ingredientSelection.selectedIngredient ||
      !ingredientSelection.quantity
    )
      return;

    // Find the selected ingredient details
    const selectedIngredientData = ingredients.find(
      (ing) => (ing._id || ing.id) === ingredientSelection.selectedIngredient
    );

    if (!selectedIngredientData) return;

    // Check if ingredient is already added
    const existingIngredient = formData.ingredients.find(
      (ing) => (ing._id || ing.id) === ingredientSelection.selectedIngredient
    );

    if (existingIngredient) {
      alert("This ingredient is already added to the menu item.");
      return;
    }

    const ingredientId =
      selectedIngredientData._id || selectedIngredientData.id;
    const newIngredient = {
      _id: ingredientId,
      id: ingredientId, // Include both for compatibility
      name: selectedIngredientData.name,
      quantity: parseFloat(ingredientSelection.quantity),
    };

    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, newIngredient],
    });

    setIngredientSelection({ selectedIngredient: "", quantity: "" });
  };

  const removeIngredient = (ingredientId) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter(
        (ing) => ing._id !== ingredientId
      ),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:8000/api/menu/post",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Menu item added!");

      setMenus((prev) => [...prev, response.data.data]);

      setFormData({
        name: "",
        price: "",
        description: "",
        category: "",
        ingredients: [],
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to add menu item");
    }
  };

  // Delete functionality (unchanged)
  const handleDeleteClick = (menuId, menuName) => {
    setDeleteModal({ show: true, menuId, menuName });
  };

  const confirmDelete = () => {
    setDeleteModal({ show: false, menuId: null, menuName: "" });
    setAuthModal({ show: true, password: "", loading: false });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthModal((prev) => ({ ...prev, loading: true }));

    try {
      const authResponse = await axios.post(
        "http://localhost:8000/api/auth/verify",
        {
          password: authModal.password,
        }
      );

      if (authResponse.data.success) {
        await performDelete();
      } else {
        alert("Invalid password. Please try again.");
        setAuthModal((prev) => ({ ...prev, loading: false }));
      }
    } catch (err) {
      alert("Authentication failed. Please check your password.");
      setAuthModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const performDelete = async () => {
    const menuId = deleteModal.menuId;
    setDeleteLoading(menuId);

    try {
      await axios.delete(`http://localhost:8000/api/menu/${menuId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMenus((prev) => prev.filter((menu) => menu._id !== menuId));
      alert("Menu item deleted successfully!");

      setAuthModal({ show: false, password: "", loading: false });
      setDeleteModal({ show: false, menuId: null, menuName: "" });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete menu item");
    } finally {
      setDeleteLoading(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ show: false, menuId: null, menuName: "" });
    setAuthModal({ show: false, password: "", loading: false });
  };

  if (loading) return <div className="loading">Loading menu items...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="menu-container">
      <h1>Menu Management</h1>

      <form className="menu-form" onSubmit={handleSubmit}>
        <h2>Add New Menu Item</h2>

        <div className="form-row">
          <div className="form-group">
            <input
              type="text"
              name="name"
              placeholder="Menu Item Name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="number"
              name="price"
              placeholder="Price (Php)"
              value={formData.price}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <input
            type="text"
            name="description"
            placeholder="Description (optional)"
            value={formData.description}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <input
            type="text"
            name="category"
            placeholder="Category (e.g., Appetizer, Main Course, Dessert)"
            value={formData.category}
            onChange={handleInputChange}
          />
        </div>

        <div className="ingredient-section">
          <h3
            style={{
              color: "rgba(255, 97, 0, 1)",
              marginBottom: "1rem",
              fontSize: "1.2rem",
            }}
          >
            Ingredients
          </h3>

          <div className="ingredient-inputs">
            <select
              name="selectedIngredient"
              value={ingredientSelection.selectedIngredient}
              onChange={handleIngredientSelectionChange}
              style={{
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem",
                minWidth: "200px",
              }}
            >
              <option value="">Select ingredient...</option>
              {ingredients.map((ingredient) => {
                const ingredientId = ingredient._id || ingredient.id;

                if (!ingredientId) {
                  return null;
                }

                return (
                  <option key={ingredientId} value={ingredientId}>
                    {ingredient.name} (Current: {ingredient.quantity || 0}{" "}
                    {ingredient.unit || "units"})
                  </option>
                );
              })}
            </select>

            <input
              type="number"
              name="quantity"
              placeholder="Quantity"
              value={ingredientSelection.quantity}
              min="0.01"
              step="0.01"
              onChange={handleIngredientSelectionChange}
            />

            <button
              type="button"
              className="btn btn-add"
              onClick={addSelectedIngredient}
              disabled={
                !ingredientSelection.selectedIngredient ||
                !ingredientSelection.quantity
              }
            >
              Add Ingredient
            </button>
          </div>

          {formData.ingredients.length > 0 && (
            <ul className="ingredient-list">
              {formData.ingredients.map((ing) => (
                <li key={ing._id} className="ingredient-item">
                  <span>
                    {ing.name} - Qty: {ing.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing._id)}
                    style={{
                      float: "right",
                      background: "none",
                      border: "none",
                      color: "rgba(255, 97, 0, 1)",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" className="btn btn-primary">
          Add Menu Item
        </button>
      </form>

      <hr className="divider" />

      <h2>Current Menu Items</h2>

      {menus.length === 0 ? (
        <div className="empty-state">
          <p>No menu items found</p>
          <p>Add your first menu item using the form above!</p>
        </div>
      ) : (
        <div className="menu-grid">
          {menus.map((menu) => (
            <div key={menu._id} className="menu-card">
              <div className="menu-card-header">
                <h3>{menu.name}</h3>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteClick(menu._id, menu.name)}
                  disabled={deleteLoading === menu._id}
                  title="Delete menu item"
                >
                  {deleteLoading === menu._id ? "..." : "🗑️"}
                </button>
              </div>
              <div className="price">${menu.price}</div>
              {menu.description && (
                <p
                  style={{
                    color: "#666",
                    margin: "0.5rem 0",
                    fontSize: "0.9rem",
                  }}
                >
                  {menu.description}
                </p>
              )}
              {menu.category && (
                <span className="category">{menu.category}</span>
              )}
              {menu.ingredients && menu.ingredients.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <small style={{ color: "#888", fontSize: "0.8rem" }}>
                    Ingredients:{" "}
                    {menu.ingredients.map((ing) => ing.name).join(", ")}
                  </small>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete{" "}
                <strong>"{deleteModal.menuName}"</strong>?
              </p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {authModal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Authentication Required</h3>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-body">
                <p>Please enter your password to confirm deletion:</p>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={authModal.password}
                  onChange={(e) =>
                    setAuthModal((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                  autoFocus
                  className="auth-input"
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelDelete}
                  disabled={authModal.loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={authModal.loading || !authModal.password}
                >
                  {authModal.loading ? "Verifying..." : "Confirm Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
