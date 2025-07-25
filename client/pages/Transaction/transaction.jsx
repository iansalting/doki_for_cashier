import React, { useState, useEffect, useMemo } from "react";
import {
  Receipt,
  Filter,
  Calendar,
  Search,
  DollarSign,
  Package,
  User,
  MapPin,
  Clock,
  TrendingUp,
  Eye,
  RefreshCw,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import "./transaction.css";

const TransactionHistory = () => {
  const [allOrders, setAllOrders] = useState([]); // Store all orders from API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // Separate API filters from search term
  const [apiFilters, setApiFilters] = useState({
    paymentType: "",
    status: "",
    systemType: "",
    startDate: "",
    endDate: "",
  });

  const [searchTerm, setSearchTerm] = useState("");

  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Only fetch when API filters change, not search term
  useEffect(() => {
    fetchTransactionHistory();
  }, [apiFilters]);

  // Client-side filtering with useMemo for performance
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return allOrders;

    const searchLower = searchTerm.toLowerCase();
    return allOrders.filter(
      (order) =>
        order.customerName?.toLowerCase().includes(searchLower) ||
        order.items?.some((item) =>
          item.menuItem?.name?.toLowerCase().includes(searchLower)
        ) ||
        order._id.toLowerCase().includes(searchLower)
    );
  }, [allOrders, searchTerm]);

  const fetchTransactionHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      // Only include API filters, not search term
      Object.entries(apiFilters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      const token =
        localStorage.getItem("Bearer") || localStorage.getItem("token");

      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `http://localhost:8000/api/order/dashboard?${queryParams}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transaction history");
      }

      const data = await response.json();

      if (data.success) {
        setAllOrders(data.data || []);
        setSummary(data.summary);
        setAnalytics(data.analytics);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching transaction history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApiFilterChange = (key, value) => {
    setApiFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const clearFilters = () => {
    setApiFilters({
      paymentType: "",
      status: "",
      systemType: "",
      startDate: "",
      endDate: "",
    });
    setSearchTerm("");
  };

  const formatCurrency = (amount) => {
    return `₱${(amount || 0).toFixed(2)}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSystemBadge = (order) => {
    const isDokiApp =
      order.tableNumber !== undefined && order.users === undefined;
    return isDokiApp ? (
      <span className="transaction-badge transaction-system-badge-app">
        <MapPin className="w-3 h-3" />
        DOKI-App (Table {order.tableNumber})
      </span>
    ) : (
      <span className="transaction-badge transaction-system-badge-user">
        <User className="w-3 h-3" />
        DOKI-User ({order.customerName})
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { className: "transaction-status-badge-pending", icon: Clock },
      completed: {
        className: "transaction-status-badge-completed",
        icon: CheckCircle,
      },
      cancelled: {
        className: "transaction-status-badge-cancelled",
        icon: AlertCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`transaction-badge ${config.className}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentBadge = (payment) => {
    return payment === "cashless" ? (
      <span className="transaction-badge transaction-payment-badge-cashless">
        <DollarSign className="w-3 h-3" />
        Cashless
      </span>
    ) : (
      <span className="transaction-badge transaction-payment-badge-cash">
        <DollarSign className="w-3 h-3" />
        Cash
      </span>
    );
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  if (loading) {
    return (
      <div className="transaction-loading-container">
        <div className="transaction-loading-content">
          <RefreshCw className="transaction-loading-icon transaction-animate-spin" />
          <p className="loading-message">
            Loading transaction history, please wait...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transaction-loading-container">
        <div className="transaction-loading-content">
          <AlertCircle
            className="transaction-empty-icon"
            style={{ color: "#ef4444" }}
          />
          <h3 className="transaction-empty-title">Error Loading Data</h3>
          <p
            className="transaction-empty-text"
            style={{ marginBottom: "1rem" }}
          >
            {error}
          </p>
          <button
            onClick={fetchTransactionHistory}
            className="transaction-primary-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-container">
      <div className="transaction-max-width">
        {/* Header */}
        <div className="transaction-card transaction-fade-in">
          <div className="transaction-header">
            <div className="transaction-header-content">
              <div className="transaction-header-title">
                <Receipt
                  className="w-8 h-8"
                  style={{ color: "var(--primary-color)" }}
                />
                <div>
                  <h1 className="transaction-title">Transaction History</h1>
                  <p className="transaction-subtitle">
                    View orders from both DOKI systems
                  </p>
                </div>
              </div>
              <button
                onClick={fetchTransactionHistory}
                className="transaction-primary-button"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Analytics Cards */}
            {analytics && (
              <div className="transaction-analytics-grid">
                <div className="transaction-analytics-card">
                  <div className="transaction-analytics-header">
                    <Package
                      className="w-5 h-5"
                      style={{ color: "var(--primary-color)" }}
                    />
                    <span className="transaction-analytics-title">
                      Total Orders
                    </span>
                  </div>
                  <p className="transaction-analytics-value">
                    {analytics.totalOrders}
                  </p>
                </div>

                <div className="transaction-analytics-card">
                  <div className="transaction-analytics-header">
                    <TrendingUp
                      className="w-5 h-5"
                      style={{ color: "var(--primary-color)" }}
                    />
                    <span className="transaction-analytics-title">
                      Total Revenue
                    </span>
                  </div>
                  <p className="transaction-analytics-value">
                    {formatCurrency(analytics.totalRevenue)}
                  </p>
                </div>

                <div className="transaction-analytics-card">
                  <div className="transaction-analytics-header">
                    <MapPin
                      className="w-5 h-5"
                      style={{ color: "var(--primary-color)" }}
                    />
                    <span className="transaction-analytics-title">
                      DOKI-App
                    </span>
                  </div>
                  <p className="transaction-analytics-value">
                    {analytics.systemBreakdown?.dokiApp?.count || 0}
                  </p>
                  <p className="transaction-analytics-sub-value">
                    {formatCurrency(
                      analytics.systemBreakdown?.dokiApp?.revenue || 0
                    )}
                  </p>
                </div>

                <div className="transaction-analytics-card">
                  <div className="transaction-analytics-header">
                    <User
                      className="w-5 h-5"
                      style={{ color: "var(--primary-color)" }}
                    />
                    <span className="transaction-analytics-title">
                      DOKI-User
                    </span>
                  </div>
                  <p className="transaction-analytics-value">
                    {analytics.systemBreakdown?.dokiUser?.count || 0}
                  </p>
                  <p className="transaction-analytics-sub-value">
                    {formatCurrency(
                      analytics.systemBreakdown?.dokiUser?.revenue || 0
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="transaction-card transaction-fade-in">
          <div style={{ padding: "1.5rem" }}>
            <div className="transaction-filters-header">
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "#111827",
                  margin: 0,
                }}
              >
                Filters
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="transaction-filters-toggle"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
                <ChevronDown
                  className={`w-4 h-4 ${showFilters ? "rotate-180" : ""}`}
                  style={{
                    transform: showFilters ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
            </div>

            {showFilters && (
              <div className="transaction-filters-grid">
                <div className="transaction-form-group">
                  <label className="transaction-label">Search</label>
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="transaction-input"
                  />
                </div>

                <div className="transaction-form-group">
                  <label className="transaction-label">Payment Type</label>
                  <select
                    value={apiFilters.paymentType}
                    onChange={(e) =>
                      handleApiFilterChange("paymentType", e.target.value)
                    }
                    className="transaction-input"
                  >
                    <option value="">All Payments</option>
                    <option value="cash">Cash</option>
                    <option value="cashless">Cashless</option>
                  </select>
                </div>

                <div className="transaction-form-group">
                  <label className="transaction-label">Status</label>
                  <select
                    value={apiFilters.status}
                    onChange={(e) =>
                      handleApiFilterChange("status", e.target.value)
                    }
                    className="transaction-input"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="transaction-form-group">
                  <label className="transaction-label">System</label>
                  <select
                    value={apiFilters.systemType}
                    onChange={(e) =>
                      handleApiFilterChange("systemType", e.target.value)
                    }
                    className="transaction-input"
                  >
                    <option value="">Both Systems</option>
                    <option value="dokiapp">DOKI-App</option>
                    <option value="dokiuser">DOKI-User</option>
                  </select>
                </div>

                <div className="transaction-form-group">
                  <label className="transaction-label">Start Date</label>
                  <input
                    type="date"
                    value={apiFilters.startDate}
                    onChange={(e) =>
                      handleApiFilterChange("startDate", e.target.value)
                    }
                    className="transaction-input"
                  />
                </div>

                <div className="transaction-form-group">
                  <label className="transaction-label">End Date</label>
                  <input
                    type="date"
                    value={apiFilters.endDate}
                    onChange={(e) =>
                      handleApiFilterChange("endDate", e.target.value)
                    }
                    className="transaction-input"
                  />
                </div>
              </div>
            )}

            <div className="transaction-filters-actions">
              <button
                onClick={clearFilters}
                className="transaction-secondary-button"
              >
                Clear Filters
              </button>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
                Showing {filteredOrders.length} orders
              </p>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="transaction-orders-list transaction-fade-in">
          <div className="transaction-orders-header">
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                color: "#111827",
                margin: 0,
              }}
            >
              Orders
            </h2>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="transaction-empty-state">
              <Receipt className="transaction-empty-icon" />
              <h3 className="transaction-empty-title">No orders found</h3>
              <p className="transaction-empty-text">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <div>
              {filteredOrders.map((order) => (
                <div key={order._id} className="transaction-order-item">
                  <div className="transaction-order-header">
                    <div className="transaction-badge-container">
                      {getSystemBadge(order)}
                      {getStatusBadge(order.status)}
                      {getPaymentBadge(order.payment)}
                    </div>
                    <div className="transaction-order-total">
                      <p className="transaction-order-total-label">
                        Order Total
                      </p>
                      <p className="transaction-order-total-value">
                        {formatCurrency(order.bills?.totalWithTax)}
                      </p>
                    </div>
                  </div>

                  <div className="transaction-order-grid">
                    <div className="transaction-order-detail">
                      <p className="transaction-order-detail-label">
                        Order Date
                      </p>
                      <p className="transaction-order-detail-value">
                        {formatDate(order.createdAt || order.orderDate)}
                      </p>
                    </div>
                    <div className="transaction-order-detail">
                      <p className="transaction-order-detail-label">Items</p>
                      <p className="transaction-order-detail-value">
                        {order.items?.length || 0} item(s)
                      </p>
                    </div>
                    <div className="transaction-order-detail">
                      <p className="transaction-order-detail-label">Order ID</p>
                      <p
                        className="transaction-order-detail-value"
                        style={{
                          fontFamily: "monospace",
                          fontSize: "0.875rem",
                        }}
                      >
                        {order._id.slice(-8)}
                      </p>
                    </div>
                  </div>

                  <div className="transaction-order-actions">
                    <div className="transaction-item-tags">
                      {order.items?.slice(0, 3).map((item, index) => (
                        <span key={index} className="transaction-item-tag">
                          {item.quantity}x{" "}
                          {item.menuItem?.name || "Unknown Item"}
                        </span>
                      ))}
                      {order.items?.length > 3 && (
                        <span className="transaction-item-tag">
                          +{order.items.length - 3} more
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => openOrderDetails(order)}
                      className="transaction-view-button"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div
            className="transaction-modal"
            onClick={() => setShowOrderDetails(false)}
          >
            <div
              className="transaction-modal-content transaction-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="transaction-modal-header">
                <h2 className="transaction-modal-title">Order Details</h2>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="transaction-close-button"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="transaction-modal-body">
                <div className="transaction-modal-grid">
                  <div className="transaction-order-detail">
                    <p className="transaction-order-detail-label">Order ID</p>
                    <p
                      className="transaction-order-detail-value"
                      style={{ fontFamily: "monospace", fontSize: "0.875rem" }}
                    >
                      {selectedOrder._id}
                    </p>
                  </div>
                  <div className="transaction-order-detail">
                    <p className="transaction-order-detail-label">Date</p>
                    <p className="transaction-order-detail-value">
                      {formatDate(
                        selectedOrder.createdAt || selectedOrder.orderDate
                      )}
                    </p>
                  </div>
                  <div className="transaction-order-detail">
                    <p className="transaction-order-detail-label">Status</p>
                    <div>{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  <div className="transaction-order-detail">
                    <p className="transaction-order-detail-label">Payment</p>
                    <div>{getPaymentBadge(selectedOrder.payment)}</div>
                  </div>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <h3
                    style={{
                      fontWeight: "600",
                      color: "#111827",
                      marginBottom: "0.75rem",
                    }}
                  >
                    Order Items
                  </h3>
                  <div className="transaction-items-list">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="transaction-modal-order-item">
                        <div>
                          <p
                            style={{
                              fontWeight: "500",
                              marginBottom: "0.25rem",
                            }}
                          >
                            {item.menuItem?.name || "Unknown Item"}
                          </p>
                          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                            Size: {item.selectedSize} • Quantity:{" "}
                            {item.quantity}
                          </p>
                        </div>
                        <p style={{ fontWeight: "600" }}>
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="transaction-bill-summary">
                  <div className="transaction-bill-row">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedOrder.bills?.total)}</span>
                  </div>
                  <div className="transaction-bill-row">
                    <span>Tax:</span>
                    <span>{formatCurrency(selectedOrder.bills?.tax)}</span>
                  </div>
                  <div className="transaction-bill-row transaction-bill-total">
                    <span>Total:</span>
                    <span>
                      {formatCurrency(selectedOrder.bills?.totalWithTax)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
