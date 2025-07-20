import { useState, useEffect } from "react";
import {
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import axios from "axios";
import "./delivery.css"

const delivery = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortDirection, setSortDirection] = useState("desc");
  const [expandedDelivery, setExpandedDelivery] = useState(null);

  useEffect(() => {
    fetchAllDeliveries();
  }, []);

  const fetchAllDeliveries = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:8000/api/delivery/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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

  const deleteDelivery = async (deliveryId) => {
    if (!window.confirm("Are you sure you want to delete this delivery?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/api/delivery/${deliveryId}`);

      const updatedDeliveries = deliveries.filter((d) => d._id !== deliveryId);
      setDeliveries(updatedDeliveries);
      setFilteredDeliveries(
        sortDeliveriesByDate(updatedDeliveries, sortDirection)
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete delivery");
    }
  };

  if (loading)
    return <div className="flex justify-center p-8">Loading deliveries...</div>;

  return (
    <div className="delivery-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Delivery Dashboard</h1>
          <p className="dashboard-subtitle">View and sort all deliveries</p>
        </div>

        {error && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg mb-4">
            <p style={{ color: "#dc2626", margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Filter Section */}
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

        {/* Deliveries List */}
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

                    <div className="delivery-toggle">
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
                                {item.ingredient?.name || "Unknown Ingredient"}
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

export default delivery;
