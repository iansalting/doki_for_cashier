import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./menuPage.css";

export default function MenuPage() {
  const [menus, setMenus] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const handlePriceChange = (menuId, sizeLabel, newPrice) => {
    setUpdatedSizes((prev) => ({
      ...prev,
      [menuId]: {
        ...(prev[menuId] || {}),
        [sizeLabel]: newPrice,
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
    const sizes = Object.entries(updatedSizes[menuId] || {}).map(
      ([label, price]) => ({ label, price })
    );

    try {
      await axios.patch(
        `http://localhost:8000/api/menu/update/${menuId}`,
        { sizes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchMenus(); // reload data
      setEditItemId(null); // exit edit mode
    } catch (err) {
      alert("Failed to update menu.");
    }
  };

  if (loading) return <div className="loading">Loading menu items...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="menu-container">
      <h1>Menu Management</h1>

      <hr className="divider" />

      <h2>Current Menu Items</h2>

      {menus.length === 0 ? (
        <div className="empty-state">
          <p>No menu items found</p>
        </div>
      ) : (
        <div className="menu-grid">
          {menus.map((menu) => (
            <div key={menu._id} className="menu-card">
              <div className="menu-card-header">
                <h3>{menu.name}</h3>
                <button
                  onClick={() =>
                    setEditItemId(editItemId === menu._id ? null : menu._id)
                  }
                >
                  {editItemId === menu._id ? "Cancel" : "Edit"}
                </button>
              </div>

              {menu.description && (
                <p className="menu-description">{menu.description}</p>
              )}
              {menu.category && (
                <span className="category">{menu.category}</span>
              )}

              {editItemId === menu._id ? (
                <div className="size-edit-list">
                  {menu.sizes.map((size) => (
                    <div key={size.label} className="size-edit-row">
                      <label>{size.label}</label>
                      <input
                        type="number"
                        value={
                          updatedSizes[menu._id]?.[size.label] ?? size.price
                        }
                        onChange={(e) =>
                          handlePriceChange(
                            menu._id,
                            size.label,
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </div>
                  ))}
                  <button onClick={() => handleUpdateMenu(menu._id)}>
                    Save Changes
                  </button>
                </div>
              ) : (
                <div className="price-list">
                  {menu.sizes.map((size) => (
                    <div key={size.label} className="price">
                      {size.label}: ₱{size.price}
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
