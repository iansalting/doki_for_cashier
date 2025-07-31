import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, Package, User, MapPin } from "lucide-react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./deliveryTransaction.css";

const DeliveryDashboard = () => {
  const [ingredients, setIngredients] = useState([]);
  const [formData, setFormData] = useState({
    supplier: "",
    deliveryNumber: "",
    deliveryDate: "",
    address: "",
    notes: "",
    items: [
      {
        id: uuidv4(),
        ingredient: "",
        quantity: 0,
        unitPerPcs: 0,
        price: 0,
        expirationDate: "",
      },
    ],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Please log in to continue");
      return;
    }
    try {
      const response = await axios.get(
        "http://localhost:8000/api/ingredients/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const ingredientsData = response.data.data || response.data;
      setIngredients(ingredientsData);
    } catch (err) {
      console.error("Error fetching ingredients:", err);
      setFormError(
        err.response?.data?.message ||
          "Failed to load ingredients. Please refresh the page."
      );
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
      [field]:
        field === "quantity" || field === "unitPerPcs" || field === "price"
          ? parseFloat(value) || 0
          : value,
    };
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: uuidv4(),
          ingredient: "",
          quantity: 0,
          unitPerPcs: 0,
          price: 0,
          expirationDate: "",
        },
      ],
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, items: updatedItems }));
    }
  };

  const calculateTotalAmount = (quantity, unitPerPcs) => {
    return quantity * unitPerPcs;
  };

  const handleSubmit = async () => {
    setFormLoading(true);
    setFormError("");
    setFormSuccess("");

    if (
      !formData.supplier.trim() ||
      !formData.deliveryNumber.trim() ||
      !formData.deliveryDate ||
      !formData.address.trim()
    ) {
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

    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
    for (const item of formData.items) {
      if (
        !item.ingredient ||
        !isValidObjectId(item.ingredient) ||
        item.quantity <= 0 ||
        item.unitPerPcs <= 0 ||
        item.price === undefined ||
        item.price < 0 ||
        !item.expirationDate ||
        new Date(item.expirationDate) < new Date(formData.deliveryDate)
      ) {
        setFormError(
          "Ensure all items have a valid ingredient, quantity, unit per pcs, price, and expiration date after delivery date"
        );
        setFormLoading(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setFormError("Please log in to continue");
        setFormLoading(false);
        return;
      }

      const payload = {
        ...formData,
        items: formData.items.map(({ id, ...item }) => item), // Strip frontend id
      };

      const response = await axios.post(
        "http://localhost:8000/api/delivery/post",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFormSuccess(response.data.message || "Delivery added successfully!");
      setTimeout(() => setFormSuccess(""), 3000);

      setFormData({
        supplier: "",
        deliveryNumber: "",
        deliveryDate: "",
        address: "",
        notes: "",
        items: [
          {
            id: uuidv4(),
            ingredient: "",
            quantity: 0,
            unitPerPcs: 0,
            price: 0,
            expirationDate: "",
          },
        ],
      });

      fetchIngredients();
    } catch (err) {
      console.error("Error adding delivery:", err);
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

        <div
          style={{
            backgroundColor: "#f9fafb",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
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
            <label className="input-label">Delivery Number *</label>
            <input
              type="text"
              name="deliveryNumber"
              value={formData.deliveryNumber}
              onChange={handleInputChange}
              placeholder="e.g., DLV-0001"
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
            <label className="input-label">Delivery Address *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="address"
              required
            />
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#f9fafb",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <h3>
            <Package size={16} />
            Delivery Items
          </h3>

          {formData.items.map((item, index) => (
            <div
              key={item.id}
              style={{
                marginBottom: "20px",
                padding: "15px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto",
                  gap: "10px",
                  alignItems: "end",
                }}
              >
                <div>
                  <label>Item</label>
                  <select
                    value={item.ingredient || ""}
                    onChange={(e) =>
                      handleItemChange(index, "ingredient", e.target.value)
                    }
                    required
                  >
                    <option value="">Select ingredient...</option>
                    {ingredients.map((ingredient) => {
                      const ingredientId = ingredient._id || ingredient.id;
                      if (!ingredientId) return null;
                      return (
                        <option key={ingredientId} value={ingredientId}>
                          {ingredient.name} (Current: {ingredient.quantity || 0}{" "}
                          {ingredient.unit || "units"})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label>Item quantity</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "quantity",
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    }
                    min="0"
                    step="1"
                    placeholder="e.g., 10"
                    required
                  />
                </div>

                <div>
                  <label>Unit per Item</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "quantity",
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    }
                    min="0"
                    step="1"
                    placeholder="e.g., 10"
                    required
                  />
                </div>

                <div>
                  <label>Expiration Date *</label>
                  <input
                    type="date"
                    value={item.expirationDate || ""}
                    onChange={(e) =>
                      handleItemChange(index, "expirationDate", e.target.value)
                    }
                    min={formData.deliveryDate}
                    required
                  />
                </div>

                <div>
                  <label>Price</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "quantity",
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    }
                    min="0"
                    step="1"
                    placeholder="e.g., 10"
                    required
                  />
                </div>

                <button
                  onClick={() => removeItem(index)}
                  disabled={formData.items.length === 1}
                  style={{
                    padding: "8px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor:
                      formData.items.length === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {item.quantity > 0 && item.unitPerPcs > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "8px",
                    backgroundColor: "#f0f9ff",
                    borderRadius: "4px",
                  }}
                >
                  <small style={{ color: "#0369a1" }}>
                    Total to add:{" "}
                    {calculateTotalAmount(item.quantity, item.unitPerPcs)}
                    {ingredients.find(
                      (ing) =>
                        ing._id === item.ingredient ||
                        ing.id === item.ingredient
                    )?.unit || "units"}
                    ({item.quantity} pcs × {item.unitPerPcs})
                  </small>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addItem}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            Add Another Item
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={formLoading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: formLoading ? "#9ca3af" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            cursor: formLoading ? "not-allowed" : "pointer",
          }}
        >
          {formLoading ? "Adding Delivery..." : "Add Delivery"}
        </button>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
