import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "./order.css";

const socket = io("http://localhost:8000");

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  // Notification system
  const addNotification = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = Date.now() + Math.random();
      const notification = { id, message, type, duration };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    []
  );

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("🔑 Orders token:", token);
        console.log(
          "📡 Fetching from:",
          "http://localhost:8000/api/order/dashboard"
        );

        const response = await axios.get(
          "http://localhost:8000/api/order/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Filter to only show pending orders
        const pendingOrders = response.data.data.filter(
          (order) => order.status === "pending"
        );
        setOrders(pendingOrders);

        if (pendingOrders.length === 0) {
          addNotification("No pending orders at the moment", "info", 3000);
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch orders";
        setError(errorMessage);
        addNotification(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [addNotification]);

  useEffect(() => {
    socket.on("new-order", (newOrder) => {
      if (newOrder.status === "pending") {
        setOrders((prevOrders) => [newOrder, ...prevOrders]);
        addNotification(
          `New order received${
            newOrder.orderNumber ? ` (#${newOrder.orderNumber})` : ""
          }!`,
          "success",
          5000
        );
      }
    });

    socket.on("order-updated", (updatedOrder) => {
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === updatedOrder._id ? updatedOrder : order
        )
      );
    });

    return () => {
      socket.off("new-order");
      socket.off("order-updated");
    };
  }, [addNotification]);

  const handleUpdateOrder = async (orderId, status) => {
    try {
      setUpdatingOrderId(orderId);

      const token = localStorage.getItem("token"); // 🔐 Add this
      const response = await axios.patch(
        `http://localhost:8000/api/order/dashboard/${orderId}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Add this header
          },
        }
      );

      const updatedOrder = response.data.data;

      // Remove order from display when completed or cancelled
      if (status === "completed" || status === "cancelled") {
        setOrders((prev) => prev.filter((order) => order._id !== orderId));
        addNotification(
          `Order ${
            status === "completed" ? "completed" : "cancelled"
          } successfully!`,
          "success",
          3000
        );
      } else {
        // Update order if it's still pending
        setOrders((prev) =>
          prev.map((order) => (order._id === orderId ? updatedOrder : order))
        );
        addNotification(`Order status updated to ${status}`, "success", 3000);
      }

      // Emit socket event for order update
      socket.emit("order-status-updated", {
        orderId: orderId,
        status: status,
        updatedOrder: updatedOrder,
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to update order";
      setError(errorMessage);
      addNotification(errorMessage, "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      await handleUpdateOrder(orderId, "cancelled");
    }
  };
  const refreshOrders = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:8000/api/order/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Add token here
          },
        }
      );

      const pendingOrders = response.data.data.filter(
        (order) => order.status === "pending"
      );
      setOrders(pendingOrders);
      addNotification("Orders refreshed", "success", 2000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to refresh orders";
      addNotification(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine if order is cashless
  const isCashlessOrder = (order) => {
    return (
      order.paymentMethod === "card" ||
      order.paymentMethod === "online" ||
      order.isCashless === true ||
      (order.customerName && !order.tableNumber)
    );
  };

  // Helper function to get display name/identifier
  const getOrderIdentifier = (order) => {
    if (isCashlessOrder(order)) {
      return order.customerName || order.customerEmail || "Online Customer";
    }
    return `Table #${order.tableNumber || "N/A"}`;
  };

  // Helper function to format order total
  const formatOrderTotal = (order) => {
    if (order.bills?.totalWithTax) {
      return `₱${order.bills.totalWithTax.toFixed(2)}`;
    } else if (order.totalAmount) {
      return `₱${order.totalAmount.toFixed(2)}`;
    }
    return "N/A";
  };

  if (loading) {
    return (
      <div className="orders-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-container">
        <div className="error-container">
          <h3>Unable to load orders</h3>
          <p>{error}</p>
          <button onClick={refreshOrders} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications-container">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification notification-${notification.type}`}
              onClick={() => removeNotification(notification.id)}
            >
              <div className="notification-content">
                <span className="notification-message">
                  {notification.message}
                </span>
              </div>
              <button
                className="notification-close"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="orders-header">
        <h1>Pending Orders</h1>
        <div className="orders-actions">
          <button
            onClick={refreshOrders}
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <span className="orders-count">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <div className="empty-icon">📋</div>
          <h3>No pending orders</h3>
          <p>New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div className="order-title">
                  <h2>{getOrderIdentifier(order)}</h2>
                  {isCashlessOrder(order) && (
                    <span className="order-type cashless">Cashless</span>
                  )}
                  {!isCashlessOrder(order) && (
                    <span className="order-type dine-in">Dine-in</span>
                  )}
                </div>

                <div className="order-meta">
                  {order.orderNumber && (
                    <p className="order-number">Order #{order.orderNumber}</p>
                  )}
                  <p className="order-date">
                    {new Date(order.orderDate).toLocaleString()}
                  </p>
                  <p className="order-status">
                    Status:{" "}
                    <span className={`status-${order.status}`}>
                      {order.status}
                    </span>
                  </p>
                  <p className="order-total">
                    Total: <strong>{formatOrderTotal(order)}</strong>
                  </p>
                </div>
              </div>

              <div className="order-items">
                <h3>Items ({order.items?.length || 0}):</h3>
                <div className="items-list">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <div key={index} className="order-item">
                        <div className="item-info">
                          <strong>
                            {item?.menuItem?.name || "Unknown Item"}
                          </strong>
                          <span className="item-details">
                            Size: {item.selectedSize || "Standard"} • Qty:{" "}
                            {item?.quantity || 0}
                          </span>
                          {item.unitPrice && (
                            <span className="item-price">
                              ₱{item.unitPrice.toFixed(2)} each
                            </span>
                          )}
                        </div>
                        <div className="item-total">
                          {item.itemTotal && (
                            <span>₱{item.itemTotal.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-items">No items found</p>
                  )}
                </div>
              </div>

              <div className="order-actions">
                <h4>Actions:</h4>
                <div className="action-buttons">
                  <button
                    onClick={() => handleUpdateOrder(order._id, "completed")}
                    disabled={updatingOrderId === order._id}
                    className="btn-complete"
                  >
                    {updatingOrderId === order._id
                      ? "Completing..."
                      : "Complete Order"}
                  </button>

                  <button
                    onClick={() => handleCancelOrder(order._id)}
                    disabled={updatingOrderId === order._id}
                    className="btn-cancel"
                  >
                    {updatingOrderId === order._id
                      ? "Cancelling..."
                      : "Cancel Order"}
                  </button>
                </div>

                {isCashlessOrder(order) && order.customerEmail && (
                  <div className="customer-info">
                    <small>Customer: {order.customerEmail}</small>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
