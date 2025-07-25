import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./menuPage.css";

export default function MenuPage() {
  const [menus, setMenus] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const navigate = useNavigate();
  const [editItemId, setEditItemId] = useState(null);
  const [updatedSizes, setUpdatedSizes] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
    fetchMenus();
    fetchIngredients();
  }, []);

  const showNotification = (message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 4000);
  };

  const handlePriceChange = (menuId, sizeLabel, newPrice) => {
    // Handle empty input or invalid values
    const price = newPrice === "" ? "" : parseFloat(newPrice) || 0;
    setUpdatedSizes((prev) => ({
      ...prev,
      [menuId]: {
        ...(prev[menuId] || {}),
        [sizeLabel]: price,
      },
    }));
  };

  const token = localStorage.getItem("token");

  const fetchMenus = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/menu/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMenus(response.data.data);
    } catch (err) {
      setError("Failed to load menus");
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/ingredients/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setIngredients(response.data.data || response.data);
    } catch (err) {
      // Silently handle ingredient loading errors
    }
  };

  const handleUpdateMenu = async (menuId) => {
    // Only send sizes that have price changes
    const modifiedSizes = [];
    const menuSizes = menus.find(m => m._id === menuId)?.sizes || [];
    
    for (const size of menuSizes) {
      const updatedPrice = updatedSizes[menuId]?.[size.label];
      
      if (updatedPrice !== undefined && updatedPrice !== size.price) {
        modifiedSizes.push({
          label: size.label,
          price: updatedPrice === "" ? 0 : parseFloat(updatedPrice) || 0
        });
      }
    }

    if (modifiedSizes.length === 0) {
      showNotification("No price changes detected.", "warning");
      setEditItemId(null);
      return;
    }

    try {
      await axios.patch(
        `http://localhost:8000/api/menu/update/${menuId}`,
        { sizes: modifiedSizes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchMenus(); // reload data
      setEditItemId(null); // exit edit mode
      // Clear updated sizes for this menu
      setUpdatedSizes((prev) => {
        const newState = { ...prev };
        delete newState[menuId];
        return newState;
      });
      showNotification("Menu prices updated successfully!", "success");
    } catch (err) {
      showNotification("Failed to update menu: " + (err.response?.data?.message || err.message), "error");
    }
  };

  // Filter menus based on search term and category
  const filteredMenus = menus.filter((menu) => {
    const matchesSearch = menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (menu.description && menu.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !categoryFilter || menu.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter dropdown
  const categories = [...new Set(menus.map(menu => menu.category).filter(Boolean))];

  const formatCategoryName = (category) => {
    return category.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
  };

  if (loading) return <div className="loading">Loading menu items...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="menu-container">
      {/* Notification */}
      {notification.show && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification({ show: false, message: "", type: "" })}
              className="notification-close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <h1>Menu Management</h1>

      {/* Search and Filter Section */}
      <div className="search-filter-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-container">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="category-filter"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {formatCategoryName(category)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <hr className="divider" />

      <div className="results-header">
        <h2>Menu Items</h2>
        <span className="results-count">
          Showing {filteredMenus.length} of {menus.length} items
        </span>
      </div>

      {filteredMenus.length === 0 ? (
        <div className="empty-state">
          {searchTerm || categoryFilter ? (
            <div>
              <p>No menu items match your search criteria</p>
              <button 
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("");
                }}
                className="clear-filters-btn"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <p>No menu items found</p>
          )}
        </div>
      ) : (
        <div className="menu-grid">
          {filteredMenus.map((menu) => (
            <div key={menu._id} className="menu-card">
              <div className="menu-card-header">
                <h3>{menu.name}</h3>
                <button
                  onClick={() =>
                    setEditItemId(editItemId === menu._id ? null : menu._id)
                  }
                  className="edit-btn"
                >
                  {editItemId === menu._id ? "Cancel" : "Edit"}
                </button>
              </div>

              {menu.description && (
                <p className="menu-description">{menu.description}</p>
              )}
              
              {menu.category && (
                <span className="category-badge">
                  {formatCategoryName(menu.category)}
                </span>
              )}

              {editItemId === menu._id ? (
                <div className="size-edit-list">
                  {menu.sizes.map((size) => (
                    <div key={size.label} className="size-edit-row">
                      <label className="size-label">{size.label}:</label>
                      <input
                        type="number"
                        value={
                          updatedSizes[menu._id]?.[size.label] !== undefined 
                            ? updatedSizes[menu._id][size.label] 
                            : size.price
                        }
                        onChange={(e) =>
                          handlePriceChange(
                            menu._id,
                            size.label,
                            e.target.value
                          )
                        }
                        className="price-input"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  ))}
                  <button 
                    onClick={() => handleUpdateMenu(menu._id)}
                    className="save-btn"
                  >
                    Save Price Changes
                  </button>
                </div>
              ) : (
                <div className="price-list">
                  {menu.sizes.map((size) => (
                    <div key={size.label} className="price-item">
                      <span className="size-name">{size.label}:</span>
                      <span className="price-value">₱{size.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}