import axios from "axios";
import { useState, useEffect } from "react";
import './order.css'

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/order/dashboard");
        if (!response.ok) throw new Error("Failed to fetch orders");

        const data = await response.json();
        setOrders(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleUpdateOrder = async (orderId, status) => {
    try {
      setUpdatingOrderId(orderId);
  
      const response = await axios.patch(
        `http://localhost:8000/api/order/dashboard/${orderId}`,
        { status }
      );
  
      const updatedOrder = response.data.data;
  
      if (status === "completed" || status === "cancelled") {
        setOrders((prev) => prev.filter((order) => order._id !== orderId));
      } else {
        setOrders((prev) =>
          prev.map((order) => (order._id === orderId ? updatedOrder : order))
        );
      }
    } catch (err) {
      setError(err.message || "Failed to update order");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="orders-container">
      <h1>All Orders</h1>
      {orders.length === 0 ? (
        <p>No orders found</p>
      ) : (
        orders.map((order) => (
          <div key={order._id} className="order-card">
            <div className="order-header">
              <h2>Order #{order._id.substring(0, 6)}</h2>
              <p>Date: {new Date(order.orderDate).toLocaleString()}</p>
              <p>Status: <span className={`status-${order.status}`}>{order.status}</span></p>
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

            <div className="order-totals">
            </div>

            <div className="order-actions">
              <h4>Update Status:</h4>
              <div className="status-buttons">
                <button
                  onClick={() => handleUpdateOrder(order._id, "completed")}
                  disabled={updatingOrderId === order._id || order.status === "completed"}
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
