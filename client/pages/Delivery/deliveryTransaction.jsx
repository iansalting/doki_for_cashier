import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, Package, User, MapPin } from "lucide-react";
import axios from "axios";


const DeliveryDashboard = () => {
  const [ingredients, setIngredients] = useState([]);
  const [formData, setFormData] = useState({
    supplier: "",
    deliveryDate: "",
    notes: "",
    items: [{ ingredient: "", quantity: 0 }],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get("http://localhost:8000/api/ingredients/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ingredientsData = response.data.data || response.data;
      setIngredients(ingredientsData);
    } catch {
      setFormError("Failed to load ingredients. Please refresh the page.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === "quantity" ? parseFloat(value) || 0 : value,
    };
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ingredient: "", quantity: 0 }],
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, items: updatedItems }));
    }
  };

  const handleSubmit = async () => {
    setFormLoading(true);
    setFormError("");
    setFormSuccess("");

    if (!formData.supplier.trim() || !formData.deliveryDate) {
      setFormError("Please fill in all required fields");
      setFormLoading(false);
      return;
    }

    const deliveryDate = new Date(formData.deliveryDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (deliveryDate > today) {
      setFormError("Delivery date cannot be in the future");
      setFormLoading(false);
      return;
    }

    for (const item of formData.items) {
      if (!item.ingredient || item.quantity <= 0) {
        setFormError("Ensure all items have an ingredient and valid quantity");
        setFormLoading(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:8000/api/delivery/post",
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFormSuccess(response.data.message || "Delivery added successfully!");
      setFormData({
        supplier: "",
        deliveryDate: "",
        notes: "",
        items: [{ ingredient: "", quantity: 0 }],
      });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to add delivery");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="delivery-dashboard">
      <div className="dashboard-container">
        <h1 className="dashboard-title">Add Delivery</h1>

        {formSuccess && (
          <div>
            <p style={{ color: "#065f46" }}>{formSuccess}</p>
          </div>
        )}

        {formError && (
          <div>
            <p style={{ color: "#dc2626" }}>{formError}</p>
          </div>
        )}

        <div style={{ backgroundColor: "#f9fafb", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <MapPin size={16} />
            Delivery Information
          </h3>

          <div className="input-group">
            <label className="input-label">Supplier *</label>
            <input
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Delivery Date *</label>
            <input
              type="date"
              name="deliveryDate"
              value={formData.deliveryDate}
              onChange={handleInputChange}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              placeholder="Optional delivery notes..."
            />
          </div>
        </div>

        <div style={{ backgroundColor: "#f9fafb", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h3>
            <Package size={16} />
            Delivery Items
          </h3>

          {formData.items.map((item, index) => (
            <div key={index}>
              <label>Ingredient *</label>
              <select
                value={item.ingredient || ""}
                onChange={(e) => handleItemChange(index, "ingredient", e.target.value)}
                required
              >
                <option value="">Select ingredient...</option>
                {ingredients.map((ingredient) => {
                  const ingredientId = ingredient._id || ingredient.id;
                  if (!ingredientId) return null;
                  return (
                    <option key={ingredientId} value={ingredientId}>
                      {ingredient.name} (Current: {ingredient.quantity || 0} {ingredient.unit || "units"})
                    </option>
                  );
                })}
              </select>

              <label>Quantity *</label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                min="0.01"
                step="0.01"
                required
              />

              <button onClick={() => removeItem(index)} disabled={formData.items.length === 1}>
                Remove
              </button>
            </div>
          ))}

          <button onClick={addItem}>Add Another Item</button>
        </div>

        <button onClick={handleSubmit} disabled={formLoading}>
          {formLoading ? "Adding Delivery..." : "Add Delivery"}
        </button>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
