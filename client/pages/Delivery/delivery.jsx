import { useState, useEffect } from "react";
import {
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Package,
  User,
  MapPin,
} from "lucide-react";
import axios from "axios";
import "./delivery.css";

const DeliveryDashboard = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortDirection, setSortDirection] = useState("desc");
  const [expandedDelivery, setExpandedDelivery] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    supplier: "",
    deliveryDate: "",
    notes: "",
    items: [{ ingredient: "", quantity: 0 }],
  });
  const [ingredients, setIngredients] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

      useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, []);

  useEffect(() => {
    fetchAllDeliveries();
    fetchIngredients();
  }, []);

  const fetchAllDeliveries = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("http://localhost:8000/api/delivery/");
      const deliveriesData = response.data.data || response.data;
      setDeliveries(deliveriesData);
      setFilteredDeliveries(
        sortDeliveriesByDate(deliveriesData, sortDirection)
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch deliveries");
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    const token = localStorage.getItem("token");

    try {
      const response = await axios.get(
        "http://localhost:8000/api/ingredients/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const ingredientsData = response.data.data || response.data;
      setIngredients(ingredientsData);
    } catch (err) {
      setFormError("Failed to load ingredients. Please refresh the page.");
    }
  };

  const fetchDeliveriesByDateRange = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date must be before end date");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        "http://localhost:8000/api/delivery/date",
        {
          params: {
            startDate,
            endDate,
          },
        }
      );

      const deliveriesData = response.data.data || response.data;
      setFilteredDeliveries(
        sortDeliveriesByDate(deliveriesData, sortDirection)
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to fetch deliveries by date range"
      );
    } finally {
      setLoading(false);
    }
  };

  const sortDeliveriesByDate = (deliveryArray, direction) => {
    if (!Array.isArray(deliveryArray)) return [];

    return [...deliveryArray].sort((a, b) => {
      const dateA = new Date(a.deliveryDate);
      const dateB = new Date(b.deliveryDate);
      return direction === "asc" ? dateA - dateB : dateB - dateA;
    });
  };

  const toggleSortDirection = () => {
    const newDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(newDirection);
    setFilteredDeliveries(
      sortDeliveriesByDate(filteredDeliveries, newDirection)
    );
  };

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setError(null);
    setFilteredDeliveries(sortDeliveriesByDate(deliveries, sortDirection));
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (err) {
      return "Invalid Date";
    }
  };

  const toggleDeliveryExpand = (id) => {
    setExpandedDelivery(expandedDelivery === id ? null : id);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];

    if (field === "ingredient") {
      const matchingIngredient = ingredients.find(
        (ing) => (ing._id && ing._id === value) || (ing.id && ing.id === value)
      );
      
      if (value && !matchingIngredient) {
        console.error("No ingredient found with ID:", value);
      }
    }

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === "quantity" ? parseFloat(value) || 0 : value,
    };

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
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
      setFormData((prev) => ({
        ...prev,
        items: updatedItems,
      }));
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
        setFormError(
          "Please ensure all items have an ingredient selected and quantity greater than 0"
        );
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setFormSuccess(response.data.message || "Delivery added successfully!");

      setFormData({
        supplier: "",
        deliveryDate: "",
        notes: "",
        items: [{ ingredient: "", quantity: 0 }],
      });

      await fetchAllDeliveries();

      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess("");
      }, 2000);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to add delivery");
    } finally {
      setFormLoading(false);
    }
  };

  const deleteDelivery = async (deliveryId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this delivery? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/api/delivery/${deliveryId}`);

      const updatedDeliveries = deliveries.filter((d) => d._id !== deliveryId);
      setDeliveries(updatedDeliveries);
      setFilteredDeliveries(
        sortDeliveriesByDate(updatedDeliveries, sortDirection)
      );

      setFormSuccess("Delivery deleted successfully");
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to delete delivery");
      setTimeout(() => setFormError(""), 5000);
    }
  };

  if (loading)
    return <div className="flex justify-center p-8">Loading deliveries...</div>;

  return (
    <div className="delivery-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Delivery Dashboard</h1>
          <p className="dashboard-subtitle">Manage and track all deliveries</p>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary"
            style={{ marginTop: "10px" }}
          >
            <Plus size={16} style={{ marginRight: "5px" }} />
            {showAddForm ? "Cancel" : "Add New Delivery"}
          </button>
        </div>

        {formSuccess && (
          <div className="p-4 bg-green-100 border border-green-300 rounded-lg mb-4">
            <p style={{ color: "#065f46", margin: 0 }}>{formSuccess}</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg mb-4">
            <p style={{ color: "#dc2626", margin: 0 }}>{error}</p>
          </div>
        )}

        {showAddForm && (
          <div className="filter-card" style={{ marginBottom: "20px" }}>
            <div className="flex items-center gap-3 mb-4">
              <Package size={20} />
              <h2 className="filter-title" style={{ margin: 0 }}>
                Add New Delivery
              </h2>
            </div>

            {formError && (
              <div className="p-4 bg-red-100 border border-red-300 rounded-lg mb-4">
                <p style={{ color: "#dc2626", margin: 0 }}>{formError}</p>
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

              <div className="date-inputs">
                <div className="input-group">
                  <label className="input-label">
                    <User size={14} style={{ marginRight: "4px" }} />
                    Supplier *
                  </label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    className="date-input"
                    placeholder="Enter supplier name"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">
                    <Calendar size={14} style={{ marginRight: "4px" }} />
                    Delivery Date *
                  </label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={handleInputChange}
                    className="date-input"
                    max={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginTop: "16px" }}>
                <label className="input-label">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="date-input"
                  rows="3"
                  placeholder="Optional delivery notes..."
                  style={{ resize: "vertical" }}
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h3
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    margin: 0,
                  }}
                >
                  <Package size={16} />
                  Delivery Items
                </h3>
                <button
                  onClick={addItem}
                  className="btn btn-primary"
                  style={{ fontSize: "14px", padding: "8px 12px" }}
                >
                  <Plus size={14} style={{ marginRight: "4px" }} />
                  Add Item
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "end",
                      gap: "16px",
                      padding: "16px",
                      backgroundColor: "white",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <label className="input-label">Ingredient *</label>
                      <select
                        value={item.ingredient || ""}
                        onChange={(e) =>
                          handleItemChange(index, "ingredient", e.target.value)
                        }
                        className="date-input"
                        required
                      >
                        <option value="">Select ingredient...</option>
                        {ingredients.map((ingredient) => {
                          const ingredientId = ingredient._id || ingredient.id;

                          if (!ingredientId) {
                            return null;
                          }

                          return (
                            <option key={ingredientId} value={ingredientId}>
                              {ingredient.name} (Current:{" "}
                              {ingredient.quantity || 0}{" "}
                              {ingredient.unit || "units"})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div style={{ width: "120px" }}>
                      <label className="input-label">Quantity *</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        className="date-input"
                        min="0.01"
                        step="0.01"
                        placeholder="0"
                        required
                      />
                    </div>

                    <button
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length === 1}
                      style={{
                        padding: "8px",
                        color: "#dc2626",
                        backgroundColor: "transparent",
                        border: "none",
                        borderRadius: "4px",
                        cursor:
                          formData.items.length === 1
                            ? "not-allowed"
                            : "pointer",
                        opacity: formData.items.length === 1 ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleSubmit}
                disabled={formLoading}
                className="btn btn-primary"
                style={{
                  opacity: formLoading ? 0.5 : 1,
                  cursor: formLoading ? "not-allowed" : "pointer",
                }}
              >
                {formLoading ? "Adding Delivery..." : "Add Delivery"}
              </button>
            </div>
          </div>
        )}

        <div className="filter-card">
          <h2 className="filter-title">
            <Calendar size={20} />
            Filter by Date Range
          </h2>

          <div className="date-inputs">
            <div className="input-group">
              <label className="input-label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
              />
            </div>

            <div className="input-group">
              <label className="input-label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-input"
                min={startDate}
              />
            </div>
          </div>

          <div className="button-group">
            <button
              onClick={fetchDeliveriesByDateRange}
              className="btn btn-primary"
              disabled={!startDate || !endDate}
            >
              Apply Filter
            </button>

            <button onClick={resetFilters} className="btn btn-secondary">
              Reset
            </button>
          </div>
        </div>

        <div className="deliveries-card">
          <div className="deliveries-header">
            <h2 className="deliveries-title">
              Deliveries ({filteredDeliveries.length})
            </h2>

            <button onClick={toggleSortDirection} className="sort-button">
              Sort by Date{" "}
              {sortDirection === "asc" ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
          </div>

          {filteredDeliveries.length === 0 ? (
            <div className="empty-state">
              No deliveries found matching the selected criteria.
            </div>
          ) : (
            <ul className="delivery-list">
              {filteredDeliveries.map((delivery) => (
                <li
                  key={delivery._id}
                  className={`delivery-item ${
                    expandedDelivery === delivery._id ? "delivery-expanded" : ""
                  }`}
                >
                  <div
                    className="delivery-header"
                    onClick={() => toggleDeliveryExpand(delivery._id)}
                  >
                    <div className="delivery-info">
                      <h3>
                        Delivery from {delivery.supplier || "Unknown Supplier"}
                      </h3>
                      <p className="delivery-date">
                        Date: {formatDate(delivery.deliveryDate)}
                      </p>
                      {delivery.notes && (
                        <p
                          className="delivery-notes"
                          style={{
                            fontSize: "14px",
                            color: "#6b7280",
                            marginTop: "4px",
                          }}
                        >
                          Notes: {delivery.notes}
                        </p>
                      )}
                    </div>

                    <div
                      className="delivery-toggle"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDelivery(delivery._id);
                        }}
                        style={{
                          padding: "6px",
                          color: "#dc2626",
                          backgroundColor: "transparent",
                          border: "1px solid #dc2626",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                        title="Delete delivery"
                      >
                        <Trash2 size={14} />
                      </button>
                      {expandedDelivery === delivery._id ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </div>
                  </div>

                  {expandedDelivery === delivery._id && (
                    <div className="delivery-details">
                      <h4 className="details-title">
                        <Info size={16} /> Items in this delivery:
                      </h4>

                      {delivery.items && delivery.items.length > 0 ? (
                        <ul className="items-list">
                          {delivery.items.map((item, index) => (
                            <li key={index} className="item">
                              <span className="item-name">
                                {item.ingredient
                                  ? item.ingredient.name
                                  : "Unknown Ingredient"}
                              </span>
                              <span className="item-quantity">
                                - Quantity: {item.quantity}{" "}
                                {item.ingredient?.unit || "units"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="empty-state">No items in this delivery</p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;