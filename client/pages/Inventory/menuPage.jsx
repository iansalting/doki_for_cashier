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
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const navigate = useNavigate();
  const [editItemId, setEditItemId] = useState(null);
  const [updatedSizes, setUpdatedSizes] = useState({});
  const [updatedIngredients, setUpdatedIngredients] = useState({});

  // New states for ingredient management
  const [editingIngredients, setEditingIngredients] = useState(null);
  const [addingIngredient, setAddingIngredient] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [newIngredientData, setNewIngredientData] = useState({
    ingredientId: "",
    quantity: "",
  });
  const [editQuantityValue, setEditQuantityValue] = useState("");

  // Modal states
  const [modal, setModal] = useState({
    isOpen: false,
    type: "",
    title: "",
    content: null,
    data: null,
    onConfirm: null,
    onCancel: null,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
    fetchMenus();
    fetchIngredients();
  }, []);

  // Modal functions
  const openModal = (type, title, content, data = null, onConfirm = null, onCancel = null) => {
    setModal({
      isOpen: true,
      type,
      title,
      content,
      data,
      onConfirm,
      onCancel,
    });
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      type: "",
      title: "",
      content: null,
      data: null,
      onConfirm: null,
      onCancel: null,
    });
  };

  const showConfirmModal = (title, message, onConfirm) => {
    openModal(
      "confirm",
      title,
      message,
      null,
      () => {
        onConfirm();
        closeModal();
      },
      closeModal
    );
  };

  const showInfoModal = (title, content) => {
    openModal("info", title, content, null, closeModal);
  };

  const showMenuDetailsModal = (menu) => {
    const content = (
      <div className="menu-details-modal">
        <div className="menu-detail-section">
          <h4>Description</h4>
          <p>{menu.description || "No description available"}</p>
        </div>
        
        <div className="menu-detail-section">
          <h4>Category</h4>
          <span className="category-badge">{formatCategoryName(menu.category)}</span>
        </div>

        <div className="menu-detail-section">
          <h4>Sizes & Pricing</h4>
          {menu.sizes.map((size) => (
            <div key={size.label} className="size-detail-item">
              <div className="size-detail-header">
                <span className="size-name">{size.label}</span>
                <span className="price-value">₱{size.price}</span>
              </div>
              {size.ingredients && size.ingredients.length > 0 && (
                <div className="ingredients-detail">
                  <h5>Ingredients:</h5>
                  <ul className="ingredients-detail-list">
                    {size.ingredients.map((ing, index) => {
                      const ingredientName =
                        typeof ing.ingredient === "object"
                          ? ing.ingredient.name
                          : getIngredientName(ing.ingredient);
                      return (
                        <li key={index} className="ingredient-detail-item">
                          {ingredientName} - {ing.quantity}g
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
    openModal("info", `${menu.name} - Details`, content, null, closeModal);
  };

  const showNotification = (message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 4000);
  };

  const handlePriceChange = (menuId, sizeLabel, newPrice) => {
    const price = newPrice === "" ? 0 : parseFloat(newPrice) || 0;
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
      params: {
        populate: "sizes.ingredients.ingredient",
      },
    });
    const menusData = response.data.data.map((menu) => ({
      ...menu,
      sizes: (menu.sizes || []).map((size) => ({
        ...size,
        price: parseFloat(size.price) || 0,
      })),
    }));
    console.log("Fetched menus:", JSON.stringify(menusData, null, 2));
    setMenus([...menusData]);
  } catch (err) {
    setError("Failed to load menus");
    console.error("Fetch menus error:", err);
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
      const ingredientsData = response.data.data || response.data;
      console.log("Ingredients data:", ingredientsData); // Debug
      setIngredients(ingredientsData);
    } catch (err) {
      console.error("Failed to fetch ingredients:", err);
      showNotification("Failed to load ingredients", "error");
    }
  };

  const handleIngredientChange = (menuId, sizeLabel, selectedIngredientIds) => {
    setUpdatedIngredients((prev) => ({
      ...prev,
      [menuId]: {
        ...(prev[menuId] || {}),
        [sizeLabel]: selectedIngredientIds,
      },
    }));
  };

  // Ingredient Management Functions
  const deleteIngredient = async (menuId, sizeLabel, ingredientId) => {
    const confirmDelete = () => {
      performDeleteIngredient(menuId, sizeLabel, ingredientId);
    };

    showConfirmModal(
      "Delete Ingredient",
      "Are you sure you want to delete this ingredient? This action cannot be undone.",
      confirmDelete
    );
  };

  const performDeleteIngredient = async (menuId, sizeLabel, ingredientId) => {
    console.log("Deleting ingredient:", { menuId, sizeLabel, ingredientId }); // Debug

    try {
      await axios.delete(
        `http://localhost:8000/api/menu/${menuId}/size/${sizeLabel}/ingredient/${ingredientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      showNotification("Ingredient deleted successfully!", "success");
      fetchMenus();
    } catch (err) {
      showNotification(
        "Failed to delete ingredient: " +
          (err.response?.data?.message || err.message),
        "error"
      );
      console.error("Delete error:", err.response?.data || err); // Debug
    }
  };

  const addIngredient = async (menuId, sizeLabel) => {
    if (
      !newIngredientData.ingredientId ||
      !newIngredientData.quantity ||
      newIngredientData.quantity <= 0
    ) {
      showNotification(
        "Please select an ingredient and enter a valid quantity",
        "error"
      );
      return;
    }

    const selectedIngredient = ingredients.find(
      (ing) => ing.id === newIngredientData.ingredientId
    );
    console.log("Selected ingredient:", selectedIngredient); // Debug
    console.log("Sending ingredientId:", newIngredientData.ingredientId); // Debug

    try {
      await axios.post(
        `http://localhost:8000/api/menu/${menuId}/size/${sizeLabel}/ingredient`,
        {
          ingredientId: newIngredientData.ingredientId,
          quantity: parseFloat(newIngredientData.quantity),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      showNotification("Ingredient added successfully!", "success");
      setAddingIngredient(null);
      setNewIngredientData({ ingredientId: "", quantity: "" });
      fetchMenus();
    } catch (err) {
      showNotification(
        "Failed to add ingredient: " +
          (err.response?.data?.message || err.message),
        "error"
      );
    }
  };

  const updateIngredientQuantity = async (menuId, sizeLabel, ingredientId) => {
    if (!editQuantityValue || editQuantityValue <= 0) {
      showNotification("Please enter a valid quantity", "error");
      return;
    }

    try {
      await axios.patch(
        `http://localhost:8000/api/menu/${menuId}/size/${sizeLabel}/ingredient/${ingredientId}/quantity`,
        {
          quantity: parseFloat(editQuantityValue),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      showNotification("Ingredient quantity updated successfully!", "success");
      setEditingQuantity(null);
      setEditQuantityValue("");
      fetchMenus(); // Reload data
    } catch (err) {
      showNotification(
        "Failed to update quantity: " +
          (err.response?.data?.message || err.message),
        "error"
      );
    }
  };

const handleUpdateMenu = async (menuId) => {
  console.log("updatedSizes:", updatedSizes);
  const menu = menus.find((m) => m._id === menuId);
  console.log("Menu data:", menu);

  const confirmUpdate = () => {
    performUpdateMenu(menuId, menu);
  };

  showConfirmModal(
    "Update Menu",
    "Are you sure you want to save these price changes?",
    confirmUpdate
  );
};

const performUpdateMenu = async (menuId, menu) => {
  if (menu.category === "ramen") {
    const modifiedSizes = [];
    for (const size of menu.sizes) {
      const updatedPrice = updatedSizes[menuId]?.[size.label];
      const currentPrice = parseFloat(size.price) || 0;
      const newPrice =
        updatedPrice === undefined ? currentPrice : parseFloat(updatedPrice) || 0;

      if (updatedPrice !== undefined && newPrice !== currentPrice) {
        modifiedSizes.push({
          label: size.label,
          price: newPrice,
        });
      }
    }

    if (modifiedSizes.length === 0) {
      showNotification("No price changes detected.", "warning");
      setEditItemId(null);
      return;
    }

    console.log("Sending PATCH request for ramen:", { sizes: modifiedSizes });
    try {
      const response = await axios.patch(
        `http://localhost:8000/api/menu/update/${menuId}`,
        { sizes: modifiedSizes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("PATCH response:", response.data);
      if (!response.data.success) {
        throw new Error(response.data.message || "Update failed");
      }
    } catch (err) {
      console.error("PATCH error:", err.response?.data || err);
      showNotification(
        "Failed to update menu: " + (err.response?.data?.message || err.message),
        "error"
      );
      return;
    }
  } else {
    const updatedPrice = updatedSizes[menuId]?.basePrice; // Note: Still using basePrice key in state
    const currentPrice = menu.sizes?.find((s) => s.label === "Classic")?.price || 0;
    const newPrice =
      updatedPrice === undefined ? currentPrice : parseFloat(updatedPrice) || 0;

    if (updatedPrice === undefined || newPrice === currentPrice) {
      showNotification("No price changes detected.", "warning");
      setEditItemId(null);
      return;
    }

    const modifiedSizes = [{ label: "Classic", price: newPrice }];

    console.log("Sending PATCH request for non-ramen:", { sizes: modifiedSizes });
    try {
      const response = await axios.patch(
        `http://localhost:8000/api/menu/update/${menuId}`,
        { sizes: modifiedSizes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("PATCH response:", response.data);
      if (!response.data.success) {
        throw new Error(response.data.message || "Update failed");
      }
    } catch (err) {
      console.error("PATCH error:", err.response?.data || err);
      showNotification(
        "Failed to update menu: " + (err.response?.data?.message || err.message),
        "error"
      );
      return;
    }
  }

  await fetchMenus();
  setEditItemId(null);
  setUpdatedSizes((prev) => {
    const newState = { ...prev };
    delete newState[menuId];
    return newState;
  });
  showNotification("Menu updated successfully!", "success");
};

  const getIngredientName = (ingredientId) => {
    const ingredient = ingredients.find((ing) => ing.id === ingredientId);
    console.log(
      "Looking for ingredientId:",
      ingredientId,
      "Found:",
      ingredient
    ); // Debug
    return ingredient ? ingredient.name : "Unknown Ingredient";
  };

  const getAvailableIngredients = (menuId, sizeLabel) => {
    const menu = menus.find((m) => m._id === menuId);
    const size = menu?.sizes.find((s) => s.label === sizeLabel);
    const usedIngredientIds =
      size?.ingredients.map((ing) =>
        typeof ing.ingredient === "object" ? ing.ingredient._id : ing.ingredient
      ) || [];

    return ingredients.filter(
      (ingredient) => !usedIngredientIds.includes(ingredient.id)
    );
  };

  // Filter menus based on search term and category
  const filteredMenus = menus.filter((menu) => {
    const matchesSearch =
      menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (menu.description &&
        menu.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !categoryFilter || menu.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    ...new Set(menus.map((menu) => menu.category).filter(Boolean)),
  ];

  const formatCategoryName = (category) => {
    return category
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  if (loading) return <div className="loading">Loading menu items...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="menu-container">
      {/* Modal */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={modal.type !== "confirm" ? closeModal : undefined}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modal.title}</h3>
              <button className="modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {typeof modal.content === "string" ? (
                <p>{modal.content}</p>
              ) : (
                modal.content
              )}
            </div>
            <div className="modal-footer">
              {modal.type === "confirm" ? (
                <>
                  <button className="modal-btn modal-btn-cancel" onClick={modal.onCancel}>
                    Cancel
                  </button>
                  <button className="modal-btn modal-btn-confirm" onClick={modal.onConfirm}>
                    Confirm
                  </button>
                </>
              ) : (
                <button className="modal-btn modal-btn-primary" onClick={closeModal}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            <span>{notification.message}</span>
            <button
              onClick={() =>
                setNotification({ show: false, message: "", type: "" })
              }
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
                <div className="card-actions">
                  <button
                    onClick={() => showMenuDetailsModal(menu)}
                    className="view-details-btn"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() =>
                      setEditItemId(editItemId === menu._id ? null : menu._id)
                    }
                    className="edit-btn"
                  >
                    {editItemId === menu._id ? "Cancel" : "Edit Prices"}
                  </button>
                  <button
                    onClick={() =>
                      setEditingIngredients(
                        editingIngredients?.menuId === menu._id
                          ? null
                          : { menuId: menu._id }
                      )
                    }
                    className="ingredients-btn"
                  >
                    {editingIngredients?.menuId === menu._id
                      ? "Cancel"
                      : "Manage Ingredients"}
                  </button>
                </div>
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
                  {menu.category === "ramen" ? (
                    menu.sizes.map((size) => (
                      <div key={size.label} className="size-edit-row">
                        <label className="size-label">{size.label}:</label>
                        <input
                          type="number"
                          value={
                            updatedSizes[menu._id]?.[size.label] !== undefined
                              ? updatedSizes[menu._id][size.label]
                              : size.price
                          }
                          onChange={(e) => {
                            console.log("Input changed:", e.target.value); // Debug
                            handlePriceChange(
                              menu._id,
                              size.label,
                              e.target.value
                            );
                          }}
                          className="price-input"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="size-edit-row">
                      <label className="size-label">Base Price:</label>
                      <input
                        type="number"
                        value={
                          updatedSizes[menu._id]?.basePrice !== undefined
                            ? updatedSizes[menu._id].basePrice
                            : menu.basePrice
                        }
                        onChange={(e) =>
                          handlePriceChange(
                            menu._id,
                            "basePrice",
                            e.target.value
                          )
                        }
                        className="price-input"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => handleUpdateMenu(menu._id)}
                    className="save-btn"
                  >
                    Save Price Changes
                  </button>
                </div>
              ) : editingIngredients?.menuId === menu._id ? (
                <div className="ingredients-management">
                  {menu.sizes.map((size) => (
                    <div key={size.label} className="size-ingredients-section">
                      <h4 className="size-title">{size.label} - Ingredients</h4>

                      {/* Current Ingredients */}
                      <div className="current-ingredients">
                        {size.ingredients && size.ingredients.length > 0 ? (
                          size.ingredients
                            .map((ing, index) => {
                              console.log("Ingredient entry:", { ing, index }); // Debug
                              const ingredientId =
                                typeof ing.ingredient === "object" &&
                                ing.ingredient
                                  ? ing.ingredient._id
                                  : typeof ing.ingredient === "string"
                                  ? ing.ingredient
                                  : null;
                              console.log(
                                "Extracted ingredientId:",
                                ingredientId
                              ); // Debug
                              if (!ingredientId) {
                                console.error(
                                  "Invalid ingredientId for ingredient:",
                                  ing
                                ); // Debug
                                return null; // Skip rendering
                              }
                              const ingredientName =
                                typeof ing.ingredient === "object" &&
                                ing.ingredient
                                  ? ing.ingredient.name
                                  : getIngredientName(ingredientId);

                              const isEditingQty =
                                editingQuantity?.menuId === menu._id &&
                                editingQuantity?.sizeLabel === size.label &&
                                editingQuantity?.ingredientId === ingredientId;

                              return (
                                <div
                                  key={`${ingredientId}-${index}`}
                                  className="ingredient-item"
                                >
                                  <span className="ingredient-name">
                                    {ingredientName || "Unknown"}
                                  </span>
                                  {isEditingQty ? (
                                    <div className="quantity-edit">
                                      <input
                                        type="number"
                                        value={editQuantityValue}
                                        onChange={(e) =>
                                          setEditQuantityValue(e.target.value)
                                        }
                                        className="quantity-input"
                                        step="0.01"
                                        min="0.01"
                                        placeholder="Quantity"
                                      />
                                      <button
                                        onClick={() =>
                                          updateIngredientQuantity(
                                            menu._id,
                                            size.label,
                                            ingredientId
                                          )
                                        }
                                        className="save-quantity-btn"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingQuantity(null);
                                          setEditQuantityValue("");
                                        }}
                                        className="cancel-quantity-btn"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="quantity-display">
                                      <span className="quantity-value">
                                        {ing.quantity}g
                                      </span>
                                      <button
                                        onClick={() => {
                                          setEditingQuantity({
                                            menuId: menu._id,
                                            sizeLabel: size.label,
                                            ingredientId,
                                          });
                                          setEditQuantityValue(
                                            ing.quantity.toString()
                                          );
                                        }}
                                        className="edit-quantity-btn"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  )}
                                  <button
                                    onClick={() =>
                                      deleteIngredient(
                                        menu._id,
                                        size.label,
                                        ingredientId
                                      )
                                    }
                                    className="delete-ingredient-btn"
                                    disabled={!ingredientId}
                                  >
                                    Delete
                                  </button>
                                </div>
                              );
                            })
                            .filter(Boolean)
                        ) : (
                          <p className="no-ingredients">
                            No ingredients added yet
                          </p>
                        )}
                      </div>

                      {/* Add New Ingredient */}
                      {addingIngredient?.menuId === menu._id &&
                      addingIngredient?.sizeLabel === size.label ? (
                        <div className="add-ingredient-form">
                          <select
                            value={newIngredientData.ingredientId}
                            onChange={(e) =>
                              setNewIngredientData({
                                ...newIngredientData,
                                ingredientId: e.target.value,
                              })
                            }
                            className="ingredient-select"
                          >
                            <option value="">Select Ingredient</option>
                            {getAvailableIngredients(menu._id, size.label).map(
                              (ingredient) => (
                                <option
                                  key={ingredient.id}
                                  value={ingredient.id}
                                >
                                  {ingredient.name}
                                </option>
                              )
                            )}
                          </select>
                          <input
                            type="number"
                            value={newIngredientData.quantity}
                            onChange={(e) =>
                              setNewIngredientData({
                                ...newIngredientData,
                                quantity: e.target.value,
                              })
                            }
                            placeholder="Quantity (grams)"
                            className="quantity-input"
                            step="0.01"
                            min="0.01"
                          />
                          <button
                            onClick={() => addIngredient(menu._id, size.label)}
                            className="save-ingredient-btn"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setAddingIngredient(null);
                              setNewIngredientData({
                                ingredientId: "",
                                quantity: "",
                              });
                            }}
                            className="cancel-ingredient-btn"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setAddingIngredient({
                              menuId: menu._id,
                              sizeLabel: size.label,
                            })
                          }
                          className="add-ingredient-btn"
                          disabled={
                            getAvailableIngredients(menu._id, size.label)
                              .length === 0
                          }
                        >
                          {getAvailableIngredients(menu._id, size.label)
                            .length === 0
                            ? "All ingredients added"
                            : "Add Ingredient"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-summary">
                  <div className="price-summary">
                    <span className="summary-label">Price Range:</span>
                    <span className="summary-value">
                      {menu.sizes.length > 1 
                        ? `₱${Math.min(...menu.sizes.map(s => s.price))} - ₱${Math.max(...menu.sizes.map(s => s.price))}`
                        : `₱${menu.sizes[0]?.price || 0}`
                      }
                    </span>
                  </div>
                  <div className="sizes-summary">
                    <span className="summary-label">Available Sizes:</span>
                    <span className="summary-value">
                      {menu.sizes.map(s => s.label).join(", ")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}