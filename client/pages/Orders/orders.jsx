import axios from "axios";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./order.css";

const socket = io("http://localhost:8000");

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

    useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(
          "http://localhost:8000/api/order/dashboard"
        );
        // Filter to only show pending orders
        const pendingOrders = response.data.data.filter(order => order.status === "pending");
        setOrders(pendingOrders);
      } catch (err) {
        setError(
          err.response?.data?.message || err.message || "Failed to fetch orders"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    socket.on("new-order", (newOrder) => {
      // Only add to display if it's pending
      if (newOrder.status === "pending") {
        setOrders((prevOrders) => [newOrder, ...prevOrders]);
      }
    });

    return () => {
      socket.off("new-order");
    };
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:5000");

    socket.on("new-order", (orderData) => {
      console.log("New order received in real-time:", orderData);
      
      // Only add to display if it's pending
      if (orderData.status === "pending") {
        setOrders((prev) => [orderData, ...prev]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleUpdateOrder = async (orderId, status) => {
    try {
      setUpdatingOrderId(orderId);

      const response = await axios.patch(
        `http://localhost:8000/api/order/dashboard/${orderId}`,
        { status }
      );

      const updatedOrder = response.data.data;

      // Remove order from display when completed or cancelled
      if (status === "completed" || status === "cancelled") {
        setOrders((prev) => prev.filter((order) => order._id !== orderId));
      } else {
        // Only update if it's still pending (shouldn't happen in this case, but good to be safe)
        setOrders((prev) =>
          prev.map((order) => (order._id === orderId ? updatedOrder : order))
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to update order"
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="orders-container">
      <h1>Pending Orders</h1>
      {orders.length === 0 ? (
        <p>No pending orders found</p>
      ) : (
        orders.map((order) => (
          <div key={order._id} className="order-card">
            <div className="order-header">
              <h2>Table #{order.tableNumber || "N/A"}</h2>
              <p>Date: {new Date(order.orderDate).toLocaleString()}</p>
              <p>
                Status:{" "}
                <span className={`status-${order.status}`}>{order.status}</span>
              </p>
            </div>
            <div className="order-items">
              <h3>Items:</h3>
              <ul>
                {order.items.map((item, index) => (
                  <li key={index}>
                    <p>
                      <strong>{item.menuItem.name}</strong> x{item.quantity}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-actions">
              <h4>Update Status:</h4>
              <div className="status-buttons">
                <button
                  onClick={() => handleUpdateOrder(order._id, "completed")}
                  disabled={
                    updatingOrderId === order._id ||
                    order.status === "completed"
                  }
                  className="btn-complete"
                >
                  {updatingOrderId === order._id ? "Updating..." : "Complete"}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}