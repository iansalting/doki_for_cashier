import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./dashboard.css";

// Toast Notification Component
const Toast = ({ message, type, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✓'}
          {type === 'error' && '✕'}
          {type === 'warning' && '⚠'}
          {type === 'info' && 'ⓘ'}
        </span>
        <span className="toast-message">{message}</span>
        <button className="toast-close" onClick={onClose}>×</button>
      </div>
    </div>
  );
};

// Custom Modal Component
const Modal = ({ isOpen, onClose, title, children, size = "medium" }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`custom-modal ${size}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

// Input Modal Component
const InputModal = ({ isOpen, onClose, title, label, placeholder, onConfirm, inputType = "text" }) => {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (value.trim()) {
      onConfirm(value);
      setValue("");
      onClose();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="custom-modal small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label>{label}</label>
          <input
            type={inputType}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyPress={handleKeyPress}
            autoFocus
            className="modal-input"
          />
          <div className="modal-actions">
            <button className="button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="button-primary" 
              onClick={handleSubmit}
              disabled={!value.trim()}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [refreshLoading, setRefreshLoading] = useState(false);
  const receiptRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");

  // Enhanced states for size selection
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [modalQuantity, setModalQuantity] = useState(1);

  // Ingredient modal states
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [selectedMenuForIngredients, setSelectedMenuForIngredients] = useState(null);

  // Toast notification states
  const [toasts, setToasts] = useState([]);

  // Input modal states
  const [showTableModal, setShowTableModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);

  // Toast notification functions
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error("Failed to load saved cart:", err);
        showToast("Failed to load saved cart", "error");
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token found, should redirect to login");
      showToast("Please log in to continue", "warning");
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, []);

  // UPDATED: Changed to use the new endpoint with images
  const fetchMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("http://localhost:8000/api/menu", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch menu");
      }

      const menuData = response.data.data;
      const validMenus = Array.isArray(menuData)
        ? menuData.filter((menu) => menu && menu._id && menu.name)
        : [];

      setMenus(validMenus);
      setCategories(["All", ...(response.data.categories || [])]);
      
      if (validMenus.length === 0) {
        showToast("No menu items found", "info");
      }
    } catch (err) {
      console.error("Menu fetch error:", err);
      
      if (err.response?.status === 401) {
        setError("Please log in to view the menu.");
        showToast("Authentication required", "error");
      } else if (err.response?.status === 404) {
        setError("No menu items found.");
        showToast("No menu items available", "warning");
      } else {
        const errorMessage = err.response?.data?.message || "Failed to load menu.";
        setError(errorMessage);
        showToast(errorMessage, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // NEW: Image error handling function
  const handleImageError = (e) => {
    e.target.src = '/default-menu-image.jpg';
    e.target.alt = 'Menu item image not available';
  };

  const refreshMenu = async () => {
    setRefreshLoading(true);
    await fetchMenu();
    setRefreshLoading(false);
    showToast("Menu refreshed successfully", "success");
  };

  // Helper functions (same as before)
  const isRamenCategory = (menu) => menu.category === "ramen";
  
  const hasAvailableSizes = (menu) => {
    if (!menu.sizes || menu.sizes.length === 0) return false;
    return menu.sizes.some((size) => size.isAvailable);
  };

  const isMenuOutOfStock = (menu) => {
    if (!menu.isAvailable) return true;
    if (isRamenCategory(menu)) {
      if (!menu.sizes || menu.sizes.length === 0) return true;
      return menu.sizes.every((size) => !size.isAvailable);
    }
    return menu.isAvailable === false;
  };

  const isMenuAvailable = (menu) => {
    if (!menu.isAvailable) return false;
    if (isRamenCategory(menu)) {
      if (!menu.sizes || menu.sizes.length === 0) return false;
      return menu.sizes.some((size) => size.isAvailable);
    }
    return menu.isAvailable !== false;
  };

  const getUnavailableIngredients = (menu, size = null) => {
    if (size) {
      return size.unavailableIngredients || [];
    }
    if (menu.sizes && menu.sizes[0]) {
      return menu.sizes[0].unavailableIngredients || [];
    }
    return menu.unavailableIngredients || [];
  };

  const filteredMenus = menus.filter(
    (menu) =>
      menu.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (activeCategory === "All" || menu.category === activeCategory)
  );

  const groupedMenus = () => {
    if (activeCategory !== "All") {
      return [{ category: activeCategory, items: filteredMenus }];
    }

    const grouped = {};
    filteredMenus.forEach((menu) => {
      const category = menu.category || "Uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(menu);
    });

    return Object.entries(grouped).map(([category, items]) => ({
      category,
      items,
    }));
  };

  const viewIngredientDetails = (menuItem, size = null) => {
    setSelectedMenuForIngredients({ menuItem, size });
    setShowIngredientModal(true);
  };

  const closeIngredientModal = () => {
    setShowIngredientModal(false);
    setSelectedMenuForIngredients(null);
  };

  const openSizeModal = (menuItem) => {
    setSelectedMenuItem(menuItem);
    setSelectedSize(null);
    setModalQuantity(1);
    setShowSizeModal(true);
  };

  const closeSizeModal = () => {
    setShowSizeModal(false);
    setSelectedMenuItem(null);
    setSelectedSize(null);
    setModalQuantity(1);
  };

  const selectSize = (size) => {
    if (size.isAvailable) {
      setSelectedSize(size);
    }
  };

  const updateModalQuantity = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      setModalQuantity(newQuantity);
    }
  };

  const addToCart = (menuItem, size = null, quantity = 1) => {
    if (isRamenCategory(menuItem)) {
      if (!size) {
        showToast("Please select a size for this ramen item", "warning");
        return;
      }
      if (!size.isAvailable) {
        showToast("This size is currently unavailable due to insufficient ingredients", "error");
        return;
      }
    } else {
      if (!isMenuAvailable(menuItem)) {
        showToast("This item is currently unavailable", "error");
        return;
      }
    }

    const cartItemId = isRamenCategory(menuItem)
      ? `${menuItem._id}-${size._id}`
      : `${menuItem._id}`;

    const existingItem = cart.items.find(
      (item) => item.cartItemId === cartItemId
    );

    if (existingItem) {
      const updatedItems = cart.items.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      setCart({ items: updatedItems });
    } else {
      const newItem = {
        cartItemId,
        menuItem,
        size,
        quantity,
        name: isRamenCategory(menuItem)
          ? `${menuItem.name} (${size.label})`
          : menuItem.name,
        price: isRamenCategory(menuItem) ? size.price : menuItem.basePrice,
      };
      setCart({ items: [...cart.items, newItem] });
    }

    showToast(
      `${isRamenCategory(menuItem) ? `${menuItem.name} (${size.label})` : menuItem.name} added to cart`,
      "success"
    );

    if (isRamenCategory(menuItem)) {
      closeSizeModal();
    }
  };

  const addSizeToCart = (menuItem, size, quantity = 1) => {
    addToCart(menuItem, size, quantity);
  };

  const addDirectToCart = (menuItem) => {
    addToCart(menuItem, null, 1);
  };

  const removeItemFromCart = (cartItemId) => {
    const itemToRemove = cart.items.find(item => item.cartItemId === cartItemId);
    setCart({
      items: cart.items.filter((item) => item.cartItemId !== cartItemId),
    });
    showToast(`${itemToRemove?.name || 'Item'} removed from cart`, "info");
  };

  const updateCartItemQuantity = (cartItemId, quantity) => {
    if (quantity < 1) {
      return removeItemFromCart(cartItemId);
    }
    setCart({
      items: cart.items.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity } : item
      ),
    });
  };

  const calculateSubtotal = () => {
    return cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  };

  const confirmOrder = async () => {
    if (cart.items.length === 0) {
      showToast("Cart is empty", "warning");
      return;
    }

    const unavailableItems = cart.items.filter((item) => {
      if (isRamenCategory(item.menuItem)) {
        return !item.size.isAvailable;
      } else {
        return !isMenuAvailable(item.menuItem);
      }
    });

    if (unavailableItems.length > 0) {
      showToast(
        "Some items in your cart are no longer available. Please remove them before proceeding.",
        "error"
      );
      return;
    }

    const total = calculateSubtotal();
    setOrderTotal(total);
    setShowTableModal(true);
  };

  const handleTableConfirm = (tableNumber) => {
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async (payment) => {
    const paymentAmount = parseFloat(payment);
    
    if (isNaN(paymentAmount) || paymentAmount < orderTotal) {
      showToast("Invalid or insufficient payment", "error");
      return;
    }

    setOrderLoading(true);
    try {
      const order = {
        tableNumber: parseInt(localStorage.getItem('currentTableNumber')),
        items: cart.items.map((item) => ({
          menuItem: item.menuItem._id,
          selectedSize: isRamenCategory(item.menuItem)
            ? item.size.label
            : "Classic",
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
        })),
        bills: {
          subtotal: orderTotal,
          total: orderTotal,
        },
      };

      const response = await axios.post(
        "http://localhost:8000/api/order/dashboard",
        order,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      setReceipt({ ...response.data, payment: paymentAmount });
      setChange(paymentAmount - orderTotal);
      setShowReceipt(true);
      setCart({ items: [] });
      
      showToast("Order placed successfully!", "success");

      setTimeout(() => {
        if (showReceipt) {
          closeReceipt();
        }
      }, 30000);
    } catch (err) {
      console.error("Order error:", err);
      
      if (err.response) {
        const errorMessage =
          err.response.data?.message ||
          err.response.data?.error ||
          "Failed to place order";
        showToast(`Order failed: ${errorMessage}`, "error");
      } else if (err.request) {
        showToast("Network error: Could not connect to server", "error");
      } else {
        showToast("Failed to place order. Please try again.", "error");
      }
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
    try {
      const printWindow = window.open("", "_blank");
      printWindow.document.write(
        `<html><head><title>Receipt</title></head><body>${receiptRef.current.innerHTML}</body></html>`
      );
      printWindow.document.close();
      printWindow.print();
      showToast("Receipt sent to printer", "success");
    } catch (error) {
      showToast("Failed to print receipt", "error");
    }
    setPrintLoading(false);
  };

  if (loading) return <div className="loading">Loading menu...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <div className="menu-header">
        <h1>Menu</h1>
        <div>
          <input
            className="search-input"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="button-secondary"
            onClick={refreshMenu}
            disabled={refreshLoading}
          >
            {refreshLoading ? "⟳" : "↻"}
          </button>
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="category-filter">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-button ${
              activeCategory === cat ? "active" : ""
            }`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="dashboard-layout">
        {/* Menu items grouped by category */}
        <div className="menu-content">
          {groupedMenus().map((group, groupIndex) => (
            <div key={group.category} className="category-section">
              {activeCategory === "All" && (
                <div className="category-header">
                  <div className="category-separator-line"></div>
                  <h2 className="category-title">{group.category}</h2>
                  <div className="category-separator-line"></div>
                </div>
              )}

              <div className="menu-grid">
                {group.items.map((menu) => (
                  <div
                    key={menu._id}
                    className={`menu-card ${
                      isMenuOutOfStock(menu) ? "unavailable" : ""
                    }`}
                  >
                    {/* NEW: Image Section */}
                    <div className="menu-card-image">
                      {menu.imageUrl ? (
                        <img 
                          src={menu.imageUrl} 
                          alt={menu.imageAlt || menu.name}
                          className="menu-image"
                          onError={handleImageError}
                          loading="lazy"
                        />
                      ) : (
                        <div className="menu-image-placeholder">
                          <span className="image-placeholder-icon">🍜</span>
                          <p>No Image</p>
                        </div>
                      )}
                    </div>

                    {/* UPDATED: Wrapped content in container */}
                    <div className="menu-card-content">
                      <div className="menu-card-header">
                        <h3>{menu.name}</h3>
                        <div className="availability-controls">
                          {isMenuAvailable(menu) ? (
                            <span className="status in">Available</span>
                          ) : (
                            <>
                              <span className="status out">Out of stock</span>
                              <button
                                className="ingredient-details-btn"
                                onClick={() => viewIngredientDetails(menu)}
                                title="View ingredient details"
                              >
                                ⓘ
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {menu.description && (
                        <p className="menu-description">{menu.description}</p>
                      )}

                      {isRamenCategory(menu) ? (
                        <>
                          {menu.sizes && menu.sizes.length > 0 && (
                            <div className="size-preview">
                              <p className="size-count">
                                {menu.sizes.length} size
                                {menu.sizes.length > 1 ? "s" : ""} available
                              </p>
                              <div className="size-price-range">
                                {menu.sizes.length === 1 ? (
                                  <span>₱{menu.sizes[0].price.toFixed(2)}</span>
                                ) : (
                                  <span>
                                    ₱{Math.min(...menu.sizes.map((s) => s.price)).toFixed(2)} - ₱{Math.max(...menu.sizes.map((s) => s.price)).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <button
                            className={`button-primary ${
                              isMenuOutOfStock(menu) ? "button-disabled" : ""
                            }`}
                            onClick={() => openSizeModal(menu)}
                            disabled={isMenuOutOfStock(menu)}
                          >
                            {isMenuOutOfStock(menu) ? "Out of Stock" : "Choose Size"}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="menu-price">
                            <span>
                              ₱{menu.basePrice ? menu.basePrice.toFixed(2) : "N/A"}
                            </span>
                          </div>

                          <button
                            className={`button-primary ${
                              isMenuOutOfStock(menu) ? "button-disabled" : ""
                            }`}
                            onClick={() => addDirectToCart(menu)}
                            disabled={isMenuOutOfStock(menu)}
                          >
                            {isMenuOutOfStock(menu) ? "Out of Stock" : "Add to Cart"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Cart Section */}
        <div className="cart-section">
          <div className="cart-panel">
            <div className="cart-header">
              <h1>Cart ({cart.items.length})</h1>
            </div>

            {cart.items.length === 0 ? (
              <p>Your cart is empty</p>
            ) : (
              <>
                {cart.items.map((item, index) => (
                  <div
                    key={item.cartItemId}
                    className={`cart-item ${
                      (isRamenCategory(item.menuItem) && !item.size?.isAvailable) ||
                      (!isRamenCategory(item.menuItem) && !isMenuAvailable(item.menuItem))
                        ? "cart-item-unavailable" : ""
                    }`}
                  >
                    <div className="cart-item-header">
                      <span>{item.name}</span>
                      {((isRamenCategory(item.menuItem) && !item.size?.isAvailable) ||
                        (!isRamenCategory(item.menuItem) && !isMenuAvailable(item.menuItem))) && (
                        <span className="unavailable-badge">Unavailable</span>
                      )}
                    </div>
                    <div className="cart-item-details">
                      <div className="quantity-control">
                        <button
                          className="quantity-button"
                          onClick={() =>
                            updateCartItemQuantity(item.cartItemId, item.quantity - 1)
                          }
                        >
                          -
                        </button>
                        <span className="quantity-display">{item.quantity}</span>
                        <button
                          className="quantity-button"
                          onClick={() =>
                            updateCartItemQuantity(item.cartItemId, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                      <div className="cart-item-price">
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    <button
                      className="button-secondary"
                      onClick={() => removeItemFromCart(item.cartItemId)}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div className="total-section">
                  <span>Total: ₱{calculateSubtotal().toFixed(2)}</span>
                </div>

                <button
                  className="button-primary"
                  onClick={confirmOrder}
                  disabled={orderLoading}
                  style={{ width: "100%", marginTop: "1rem" }}
                >
                  {orderLoading ? "Processing..." : "Confirm Order"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Size Selection Modal - UPDATED with images */}
      {showSizeModal && selectedMenuItem && isRamenCategory(selectedMenuItem) && (
        <Modal
          isOpen={showSizeModal}
          onClose={closeSizeModal}
          title={selectedMenuItem.name}
          size="large"
        >
          {/* NEW: Show image in size modal */}
          {selectedMenuItem.imageUrl && (
            <div className="modal-image-container">
              <img 
                src={selectedMenuItem.imageUrl} 
                alt={selectedMenuItem.imageAlt || selectedMenuItem.name}
                className="modal-image"
                onError={handleImageError}
              />
            </div>
          )}

          {selectedMenuItem.description && (
            <p className="menu-description">{selectedMenuItem.description}</p>
          )}

          <div className="size-options">
            <h3>Choose Size:</h3>
            {selectedMenuItem.sizes.map((size) => (
              <div
                key={size._id}
                className={`size-option ${
                  !size.isAvailable ? "size-unavailable" : ""
                } ${selectedSize?._id === size._id ? "selected" : ""}`}
                onClick={() => selectSize(size)}
              >
                <div className="size-info">
                  <div className="size-name-price">
                    <span className="size-name">{size.label}</span>
                    <span className="size-price">₱{size.price.toFixed(2)}</span>
                  </div>
                  {!size.isAvailable && (
                    <div className="size-unavailable-info">
                      <span className="unavailable-text">Unavailable</span>
                      <button
                        className="ingredient-details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewIngredientDetails(selectedMenuItem, size);
                        }}
                        title="View ingredient details"
                      >
                        ⓘ
                      </button>
                    </div>
                  )}
                </div>

                {size.ingredients && size.ingredients.length > 0 && (
                  <div className="size-ingredients">
                    <p>Ingredients:</p>
                    <div className="ingredient-tags">
                      {size.ingredients.map((ing, idx) => (
                        <span key={idx} className="ingredient-tag">
                          {ing.ingredient.name} ({ing.quantity})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedSize && (
            <div className="size-selection-controls">
              <div className="quantity-section">
                <label>Quantity:</label>
                <div className="quantity-control">
                  <button
                    className="quantity-button"
                    onClick={() => updateModalQuantity(modalQuantity - 1)}
                    disabled={modalQuantity <= 1}
                  >
                    -
                  </button>
                  <span className="quantity-display">{modalQuantity}</span>
                  <button
                    className="quantity-button"
                    onClick={() => updateModalQuantity(modalQuantity + 1)}
                    disabled={modalQuantity >= 99}
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                className="button-primary"
                disabled={!selectedSize?.isAvailable}
                onClick={() => addSizeToCart(selectedMenuItem, selectedSize, modalQuantity)}
              >
                {selectedSize?.isAvailable
                  ? `Add to Cart - ₱${(selectedSize.price * modalQuantity).toFixed(2)}`
                  : "Size Unavailable"}
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Table Number Modal */}
      <InputModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        title="Table Number"
        label="Enter table number:"
        placeholder="e.g. 5"
        inputType="number"
        onConfirm={(tableNumber) => {
          localStorage.setItem('currentTableNumber', tableNumber);
          handleTableConfirm(tableNumber);
          setShowTableModal(false);
        }}
      />

      {/* Payment Modal */}
      <InputModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Payment"
        label={`Total: ₱${orderTotal.toFixed(2)}. Enter payment amount:`}
        placeholder="0.00"
        inputType="number"
        onConfirm={(payment) => {
          handlePaymentConfirm(payment);
          setShowPaymentModal(false);
        }}
      />

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="receipt-modal">
          <div className="receipt-box">
            <div className="receipt-header">
              <h3>Order Receipt</h3>
            </div>
            <div className="receipt-body" ref={receiptRef}>
              <div className="receipt-store-header">
                <h2 className="store-name">DOKI DOKI RAMEN HOUSE</h2>
                <p className="store-address">381 SBM. Eliserio G. Tagle,</p>
                <p className="store-address">Sampaloc 3, Dasmariñas, 4114 Cavite</p>
                <p className="store-contact">Phone: +63 912 345 6789</p>
                <p className="store-tin">TIN: 123-456-789-000</p>
                <p className="store-permit">BP: 2024-001234</p>
              </div>

              <div className="receipt-divider">========================================</div>

              <div className="receipt-order-info">
                <div className="receipt-row">
                  <span>Order #:</span>
                  <span>
                    {receipt.data?.orderNumber ||
                      receipt.orderId?.toString().slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="receipt-row">
                  <span>Table:</span>
                  <span>{receipt.data?.tableNumber || receipt.tableNumber}</span>
                </div>
                <div className="receipt-row">
                  <span>Date:</span>
                  <span>
                    {new Date(receipt.data?.orderDate || receipt.orderDate).toLocaleDateString("en-PH")}
                  </span>
                </div>
                <div className="receipt-row">
                  <span>Time:</span>
                  <span>
                    {new Date(receipt.data?.orderDate || receipt.orderDate).toLocaleTimeString("en-PH")}
                  </span>
                </div>
                <div className="receipt-row">
                  <span>Status:</span>
                  <span>
                    {(receipt.data?.status || receipt.status || "PENDING").toUpperCase()}
                  </span>
                </div>
                <div className="receipt-row">
                  <span>Payment:</span>
                  <span>CASH</span>
                </div>
              </div>

              <div className="receipt-divider">----------------------------------------</div>

              <div className="receipt-items-header">
                <div className="item-col-name">ITEM</div>
                <div className="item-col-qty">QTY</div>
                <div className="item-col-price">PRICE</div>
                <div className="item-col-total">TOTAL</div>
              </div>

              <div className="receipt-divider">----------------------------------------</div>

              <div className="receipt-items">
                {(receipt.data?.items || receipt.items || []).map((item, i) => {
                  const unitPrice = item.unitPrice || item.subtotal / item.quantity || item.price || 0;
                  const itemTotal = item.subtotal || item.price * item.quantity || 0;
                  const itemName = item.size && item.size !== "Classic"
                    ? `${item.name} (${item.size})`
                    : item.name;

                  return (
                    <div key={i} className="receipt-item">
                      <div className="item-col-name">{itemName}</div>
                      <div className="item-col-qty">{item.quantity}</div>
                      <div className="item-col-price">₱{unitPrice.toFixed(2)}</div>
                      <div className="item-col-total">₱{itemTotal.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>

              <div className="receipt-divider">----------------------------------------</div>

              <div className="receipt-totals">
                <div className="receipt-total-row">
                  <span>Subtotal:</span>
                  <span>
                    ₱{(receipt.data?.bills?.total || receipt.total || calculateSubtotal()).toFixed(2)}
                  </span>
                </div>
                <div className="receipt-total-row">
                  <span>Tax (8%):</span>
                  <span>
                    ₱{(receipt.data?.bills?.tax || calculateSubtotal() * 0.08).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="receipt-divider-double">========================================</div>

              <div className="receipt-grand-total">
                <div className="receipt-total-row grand">
                  <span>TOTAL:</span>
                  <span>
                    ₱{(receipt.data?.bills?.totalWithTax || receipt.total || calculateSubtotal() * 1.08).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="receipt-divider">========================================</div>

              <div className="receipt-payment">
                <div className="receipt-total-row">
                  <span>Cash Received:</span>
                  <span>₱{(receipt.payment || 0).toFixed(2)}</span>
                </div>
                <div className="receipt-total-row">
                  <span>Change:</span>
                  <span>₱{change.toFixed(2)}</span>
                </div>
              </div>

              <div className="receipt-divider">========================================</div>

              <div className="receipt-footer">
                <p className="thank-you">Thank you for dining with us!</p>
                <p className="come-again">Please come again!</p>
                <div className="receipt-meta">
                  <p>Cashier: System</p>
                  <p>Printed: {new Date().toLocaleString("en-PH")}</p>
                </div>
              </div>
            </div>

            <div className="receipt-actions">
              <button
                className="button-primary"
                onClick={printReceipt}
                disabled={printLoading}
              >
                {printLoading ? "Printing..." : "Print Receipt"}
              </button>
              <button className="button-secondary" onClick={closeReceipt}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Details Modal */}
      {showIngredientModal && selectedMenuForIngredients && (
        <Modal
          isOpen={showIngredientModal}
          onClose={closeIngredientModal}
          title={`${selectedMenuForIngredients.menuItem.name}${
            selectedMenuForIngredients.size ? ` (${selectedMenuForIngredients.size.label})` : ""
          } - Ingredient Status`}
        >
          <div className="ingredient-status-info">
            <p>
              <strong>Status:</strong>{" "}
              <span className="status-unavailable">Out of Stock</span>
            </p>
            <p>
              <strong>Reason:</strong> Missing or insufficient ingredients
            </p>
          </div>
          <div className="ingredient-list">
            <h3>Ingredient Requirements:</h3>
            {getUnavailableIngredients(
              selectedMenuForIngredients.menuItem,
              selectedMenuForIngredients.size
            ).map((ingredient, index) => (
              <div key={index} className="ingredient-item">
                <div className="ingredient-name">{ingredient.name}</div>
                <div className="ingredient-details">
                  <span className="ingredient-status">{ingredient.reason}</span>
                  {ingredient.required && (
                    <span className="ingredient-quantity">
                      Required: {ingredient.required} {ingredient.unit || "units"} | 
                      Available: {ingredient.available || 0} {ingredient.unit || "units"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}