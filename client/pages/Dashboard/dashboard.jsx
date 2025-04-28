import React, { useState, useEffect } from "react";
import axios from "axios";
import './Dashboard.css';


export default function Dashboard() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({ items: [] });
  const [showReceipt, setShowReceipt] = useState(false);
  const [receipt, setReceipt] = useState({});

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/menu/");
        setMenus(response.data.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const addItemToCart = (menuItem) => {
    const existingItem = cart.items.find(
      (item) => item.menuItem._id === menuItem._id
    );

    if (existingItem) {
      const updatedItems = cart.items.map((item) =>
        item.menuItem._id === menuItem._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setCart({ items: updatedItems });
    } else {
      setCart({ items: [...cart.items, { menuItem, quantity: 1 }] });
    }
  };

  const removeItemFromCart = (menuItem) => {
    const updatedItems = cart.items.filter(
      (item) => item.menuItem._id !== menuItem._id
    );
    setCart({ items: updatedItems });
  };

  const updateCartItemQuantity = (menuItem, quantity) => {
    if (quantity < 1) {
      removeItemFromCart(menuItem);
      return;
    }

    const updatedItems = cart.items.map((item) =>
      item.menuItem._id === menuItem._id ? { ...item, quantity } : item
    );
    setCart({ items: updatedItems });
  };

  // Calculate subtotal
  const calculateSubtotal = () => {
    return cart.items.reduce(
      (total, item) => total + item.menuItem.price * item.quantity,
      0
    );
  };

  const confirmOrder = async () => {
    try {
      const tableNumber = prompt("Enter Table Number:");
      if (!tableNumber) return;

      const orderDetails = {
        tableNumber,
        items: cart.items.map((item) => ({
          menuItem: item.menuItem._id,
          quantity: item.quantity,
        })),
      };
      const response = await axios.post(
        "http://localhost:8000/api/order/dashboard",
        orderDetails
      );
      setReceipt(response.data);
      setShowReceipt(true);
      setCart({ items: [] });
      setTimeout(() => {
        setShowReceipt(false);
        setReceipt({});
      }, 5000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="dashboard">
      <div className="container-1">
        <h1>Menu</h1>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p>Error: {error}</p>
        ) : menus.length === 0 ? (
          <p>No menu items found</p>
        ) : (
          <ul>
            {menus.map((menu) => (
              <li key={menu._id}>
                <h2>{menu.name}</h2>
                <p>Price: Php{menu.price}</p>
                <button onClick={() => addItemToCart(menu)}>add to cart</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="container-2">
        <h1>Cart</h1>
        <ul>
          {cart.items.map((item) => (
            <li key={item.menuItem._id}>
              <h2>{item.menuItem.name}</h2>
              <p>Quantity: {item.quantity}</p>
              <p>Price: Php{item.menuItem.price * item.quantity}</p>
              <button
                onClick={() =>
                  updateCartItemQuantity(item.menuItem, item.quantity + 1)
                }
              >
                +
              </button>
              <button
                onClick={() =>
                  updateCartItemQuantity(item.menuItem, item.quantity - 1)
                }
              >
                -
              </button>
              <button onClick={() => removeItemFromCart(item.menuItem)}>
                remove
              </button>
            </li>
          ))}
        </ul>
        <p>Subtotal: Php{calculateSubtotal()}</p>
        <button onClick={confirmOrder}>Confirm Order</button>
      </div>
      {showReceipt && (
        <div className="receipt">
          <h2>Receipt</h2>
          <p>Table Number: {receipt.tableNumber}</p>
          <p>Order Date: {receipt.orderDate}</p>
          <ul>
            {receipt.items.map((item) => (
              <li key={item.menuItem}>
                <h3>{item.menuItem.name}</h3>
                <p>Quantity: {item.quantity}</p>
                <p>Price: Php{item.menuItem.price * item.quantity}</p>
              </li>
            ))}
          </ul>
          <p>Total: Php{receipt.total}</p>
        </div>
      )}
    </div>
  );
}
