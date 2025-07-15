import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import './dashboard.css';

export default function Dashboard() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({ items: [] });
  const [showReceipt, setShowReceipt] = useState(false);
  const [receipt, setReceipt] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [change, setChange] = useState(0);
  const [orderLoading, setOrderLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState({});
  const receiptRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/menulist/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const menuData = response.data.data;
      const validMenus = Array.isArray(menuData)
        ? menuData.filter(menu => menu && menu._id && menu.name && menu.price !== undefined && !isNaN(parseFloat(menu.price)))
        : [];
      setMenus(validMenus);
    } catch (err) {
      setError("Failed to load menu.");
    } finally {
      setLoading(false);
    }
  };

  // Show ingredient details modal
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);

  const viewIngredientDetails = (menuItem) => {
    setSelectedMenuItem(menuItem);
    setShowIngredientModal(true);
  };

  const closeIngredientModal = () => {
    setShowIngredientModal(false);
    setSelectedMenuItem(null);
  };

  const addItemToCart = (menuItem, quantity = 1) => {
    // Check if item is available based on ingredient availability
    if (!menuItem.isAvailable) {
      alert("This item is currently unavailable due to insufficient ingredients.");
      return;
    }
    
    const existingItem = cart.items.find(item => item.menuItem._id === menuItem._id);
    if (existingItem) {
      const updatedItems = cart.items.map(item =>
        item.menuItem._id === menuItem._id ? { ...item, quantity: item.quantity + quantity } : item
      );
      setCart({ items: updatedItems });
    } else {
      setCart({ items: [...cart.items, { menuItem, quantity }] });
    }
  };

  const removeItemFromCart = (menuItem) => {
    setCart({ items: cart.items.filter(item => item.menuItem._id !== menuItem._id) });
  };

  const updateCartItemQuantity = (menuItem, quantity) => {
    if (quantity < 1) return removeItemFromCart(menuItem);
    setCart({
      items: cart.items.map(item =>
        item.menuItem._id === menuItem._id ? { ...item, quantity } : item
      )
    });
  };

  const [quantities, setQuantities] = useState({});

  const getQuantity = (menuItemId) => quantities[menuItemId] || 1;

  const updateQuantity = (menuItemId, newQuantity) => {
    if (newQuantity >= 1) {
      setQuantities(prev => ({ ...prev, [menuItemId]: newQuantity }));
    }
  };

  const calculateSubtotal = () => {
    return cart.items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  };

  const confirmOrder = async () => {
    if (cart.items.length === 0) return alert("Cart is empty");
    
    // Check if any cart items are unavailable
    const unavailableItems = cart.items.filter(item => !item.menuItem.isAvailable);
    if (unavailableItems.length > 0) {
      alert("Some items in your cart are no longer available due to ingredient shortages. Please remove them before proceeding.");
      return;
    }
    
    const tableNumber = prompt("Enter table number");
    const total = calculateSubtotal();
    const payment = parseFloat(prompt(`Total is ₱${total.toFixed(2)}. Enter payment:`));
    if (isNaN(payment) || payment < total) return alert("Invalid or insufficient payment.");

    setOrderLoading(true);
    try {
      const order = {
        tableNumber,
        items: cart.items.map(item => ({
          menuItem: item.menuItem._id,
          quantity: item.quantity,
          name: item.menuItem.name,
          price: item.menuItem.price,
        })),
        total,
        timestamp: new Date().toISOString(),
      };
      const response = await axios.post("http://localhost:8000/api/order/dashboard", order);
      setReceipt({ ...response.data, payment });
      setChange(payment - total);
      setShowReceipt(true);
      setCart({ items: [] });
      setTimeout(() => closeReceipt(), 30000);
    } catch (err) {
      alert("Failed to place order.");
    } finally {
      setOrderLoading(false);
    }
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setReceipt({});
    setChange(0);
  };

  const printReceipt = () => {
    setPrintLoading(true);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>Receipt</title></head><body>${receiptRef.current.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
    setPrintLoading(false);
  };

  const filteredMenus = menus.filter(menu =>
    menu.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="container">
      <div className="menu-header">
        <h1>Menu</h1>
        <div>
          <input
            className="search-input"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="button-secondary" onClick={fetchMenu}>↻</button>
        </div>
      </div>

      <div className="menu-grid">
        {filteredMenus.map(menu => (
          <div key={menu._id} className={`menu-card ${!menu.isAvailable ? 'unavailable' : ''}`}>
            <div className="menu-card-header">
              <h3>{menu.name}</h3>
              <div className="availability-controls">
                <span className={`availability-status ${menu.isAvailable ? 'available' : 'unavailable'}`}>
                  {menu.isAvailable ? 'Available' : 'Out of Stock'}
                </span>
                {!menu.isAvailable && menu.unavailableIngredients && (
                  <button 
                    className="ingredient-details-btn"
                    onClick={() => viewIngredientDetails(menu)}
                    title="View ingredient details"
                  >
                    ⓘ
                  </button>
                )}
              </div>
            </div>
            <p>₱{parseFloat(menu.price).toFixed(2)}</p>
            <div className="quantity-control">
              <button 
                className="quantity-button" 
                onClick={() => updateQuantity(menu._id, getQuantity(menu._id) - 1)}
                disabled={getQuantity(menu._id) <= 1 || !menu.isAvailable}
              >
                -
              </button>
              <span className="quantity-display">{getQuantity(menu._id)}</span>
              <button 
                className="quantity-button" 
                onClick={() => updateQuantity(menu._id, getQuantity(menu._id) + 1)}
                disabled={!menu.isAvailable}
              >
                +
              </button>
            </div>
            <button 
              className={`button-primary ${!menu.isAvailable ? 'button-disabled' : ''}`}
              onClick={() => addItemToCart(menu, getQuantity(menu._id))}
              disabled={!menu.isAvailable}
            >
              {!menu.isAvailable ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        ))}
      </div>

      <div className="cart-panel">
        <div className="cart-header">
          <h1>Cart ({cart.items.length})</h1>
          <button className="button-secondary" onClick={() => setCart({ items: [] })}>Clear</button>
        </div>
        {cart.items.map(item => (
          <div key={item.menuItem._id} className={`cart-item ${!item.menuItem.isAvailable ? 'cart-item-unavailable' : ''}`}>
            <div className="cart-item-header">
              <h3>{item.menuItem.name}</h3>
              {!item.menuItem.isAvailable && (
                <span className="unavailable-badge">Ingredients unavailable</span>
              )}
            </div>
            <p>₱{item.menuItem.price.toFixed(2)} × {item.quantity}</p>
            <div className="quantity-control">
              <button className="quantity-button" onClick={() => updateCartItemQuantity(item.menuItem, item.quantity - 1)}>-</button>
              <span>{item.quantity}</span>
              <button className="quantity-button" onClick={() => updateCartItemQuantity(item.menuItem, item.quantity + 1)}>+</button>
            </div>
            <p>Total: ₱{(item.menuItem.price * item.quantity).toFixed(2)}</p>
            <button className="button-secondary" onClick={() => removeItemFromCart(item.menuItem)}>Remove</button>
          </div>
        ))}
        <div className="total-section">
          <span>Total:</span>
          <span>₱{calculateSubtotal().toFixed(2)}</span>
        </div>
        <button className="button-primary" onClick={confirmOrder} disabled={orderLoading}>{orderLoading ? 'Placing...' : 'Confirm Order'}</button>
      </div>

      {showReceipt && (
        <div className="receipt-modal">
          <div className="receipt-box">
            <div className="receipt-header">Order Receipt</div>
            <div className="receipt-body" ref={receiptRef}>
              <p>Order ID: {receipt.orderId}</p>
              <p>Table: {receipt.tableNumber}</p>
              <p>Date: {new Date(receipt.orderDate).toLocaleString()}</p>
              <p>Items:</p>
              {receipt.items?.map((item, i) => (
                <p key={i}>{item.name} × {item.quantity} — ₱{item.subtotal.toFixed(2)}</p>
              ))}
              <p>Total: ₱{receipt.total?.toFixed(2)}</p>
              <p>Payment: ₱{receipt.payment?.toFixed(2)}</p>
              <p>Change: ₱{change.toFixed(2)}</p>
            </div>
            <div className="receipt-actions">
              <button className="button-primary" onClick={printReceipt} disabled={printLoading}>{printLoading ? 'Printing...' : 'Print'}</button>
              <button className="button-secondary" onClick={closeReceipt}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Details Modal */}
      {showIngredientModal && selectedMenuItem && (
        <div className="modal-overlay">
          <div className="ingredient-modal">
            <div className="modal-header">
              <h2>{selectedMenuItem.name} - Ingredient Status</h2>
              <button className="close-modal" onClick={closeIngredientModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="ingredient-status-info">
                <p><strong>Status:</strong> <span className="status-unavailable">Out of Stock</span></p>
                <p><strong>Reason:</strong> Missing or insufficient ingredients</p>
              </div>
              <div className="ingredient-list">
                <h3>Ingredient Requirements:</h3>
                {selectedMenuItem.unavailableIngredients?.map((ingredient, index) => (
                  <div key={index} className="ingredient-item">
                    <div className="ingredient-name">{ingredient.name}</div>
                    <div className="ingredient-details">
                      <span className="ingredient-status">{ingredient.reason}</span>
                      {ingredient.required && (
                        <span className="ingredient-quantity">
                          Required: {ingredient.required} {ingredient.unit || 'units'} | 
                          Available: {ingredient.available || 0} {ingredient.unit || 'units'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="button-secondary" onClick={closeIngredientModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}