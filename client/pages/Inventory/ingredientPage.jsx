import { useState, useEffect } from "react";
import axios from "axios";
import "./ingredientPage.css";
import { useNavigate } from "react-router-dom";

export default function Ingredient() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [deleteModal, setDeleteModal] = useState({ show: false, ingredientId: null, ingredientName: "" });
  const [authModal, setAuthModal] = useState({ show: false, password: "", loading: false, ingredientId: null, ingredientName: "" });
  const [batchModal, setBatchModal] = useState({ show: false, ingredient: null });
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const unitLabels = { g: "Grams", kg: "Kilograms", ml: "Milliliters", l: "Liters", pcs: "Pieces" };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  useEffect(() => { if (!token) navigate("/login"); }, [navigate, token]);

  const fetchIngredients = async (filter = "all") => {
    try {
      setLoading(true);
      setError("");
      let endpoint = filter === "expired" ? "http://localhost:8000/api/ingredients/expired" : "http://localhost:8000/api/ingredients/";
      const response = await axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      setIngredients(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      setError(error.response?.data?.message || error.message);
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIngredients(filterType); }, [filterType]);

  const handleFilterChange = (newFilter) => {
    setFilterType(newFilter);
    setSearchTerm("");
  };

  const handleDeleteClick = (ingredientId, ingredientName) => setDeleteModal({ show: true, ingredientId, ingredientName });

  const handleShowBatches = (ingredient) => {
    setBatchModal({ show: true, ingredient });
  };

  const confirmDelete = () => {
    setAuthModal({ show: true, password: "", loading: false, ingredientId: deleteModal.ingredientId, ingredientName: deleteModal.ingredientName });
    setDeleteModal({ show: false, ingredientId: null, ingredientName: "" });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthModal((prev) => ({ ...prev, loading: true }));
    try {
      const { data } = await axios.post("http://localhost:8000/api/auth/verify-user", { password: authModal.password }, { headers: { Authorization: `Bearer ${token}` } });
      if (!data.success) return showToast(data.message || "Invalid password.", "error");
      if (data.role !== "superadmin") return navigate("/salesreport/storage");
      await performDelete();
    } catch (err) {
      showToast(err.response?.data?.message || "Authentication failed.", "error");
    } finally {
      setAuthModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const performDelete = async () => {
    const { ingredientId } = authModal;
    if (!ingredientId) return showToast("Invalid ingredient ID", "error");
    setDeleteLoading(ingredientId);
    try {
      await axios.delete(`http://localhost:8000/api/ingredients/${ingredientId}`, { headers: { Authorization: `Bearer ${token}` } });
      setIngredients((prev) => prev.filter((i) => (i._id || i.id) !== ingredientId));
      showToast("Ingredient deleted successfully!");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete ingredient", "error");
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setDeleteLoading(null);
      setAuthModal({ show: false, password: "", loading: false, ingredientId: null, ingredientName: "" });
      setDeleteModal({ show: false, ingredientId: null, ingredientName: "" });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ show: false, ingredientId: null, ingredientName: "" });
    setAuthModal({ show: false, password: "", loading: false, ingredientId: null, ingredientName: "" });
  };

  const closeBatchModal = () => {
    setBatchModal({ show: false, ingredient: null });
  };

  const deleteBatch = async (ingredientId, batchIndex) => {
    try {
      await axios.delete(`http://localhost:8000/api/ingredients/${ingredientId}/batch/${batchIndex}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchIngredients(filterType);
      showToast("Batch deleted successfully!");
      // Update the modal ingredient data
      const updatedIngredient = ingredients.find(ing => (ing._id || ing.id) === ingredientId);
      if (updatedIngredient) {
        setBatchModal({ show: true, ingredient: updatedIngredient });
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to delete batch", "error");
    }
  };

  const isBatchExpired = (date) => new Date(date) < new Date();
  const isBatchExpiringSoon = (date) => {
    const today = new Date();
    const expiry = new Date(date);
    const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  };

  const filteredIngredients = ingredients.filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const groupBatches = (batches) => {
    return {
      expired: batches.filter(b => isBatchExpired(b.expirationDate)),
      expiringSoon: batches.filter(b => 
        !isBatchExpired(b.expirationDate) && isBatchExpiringSoon(b.expirationDate)
      ),
      fresh: batches.filter(b => 
        !isBatchExpired(b.expirationDate) && !isBatchExpiringSoon(b.expirationDate)
      ),
    };
  };

  const statusLabels = {
    expired: "📦 Expired Batches",
    expiringSoon: "⏳ Expiring Soon",
    fresh: "✅ Fresh Batches"
  };

  const getTotalQuantity = (batches) => {
    return batches.reduce((total, batch) => total + batch.quantity, 0);
  };

  const getBatchStatusCounts = (batches) => {
    const expired = batches.filter(b => isBatchExpired(b.expirationDate)).length;
    const expiringSoon = batches.filter(b => !isBatchExpired(b.expirationDate) && isBatchExpiringSoon(b.expirationDate)).length;
    const fresh = batches.filter(b => !isBatchExpired(b.expirationDate) && !isBatchExpiringSoon(b.expirationDate)).length;
    return { expired, expiringSoon, fresh };
  };

  return (
    <div className="ingredients-container">
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "⚠️"}</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => setToast({ show: false, message: "", type: "success" })}>×</button>
          </div>
        </div>
      )}

      <div className="container-1">
        <h1>Storage</h1>
        <div className="filter-section">
          <label htmlFor="filter-select">Filter Ingredients:</label>
          <select id="filter-select" value={filterType} onChange={(e) => handleFilterChange(e.target.value)} className="filter-select">
            <option value="all">All Ingredients</option>
            <option value="expired">Expired Ingredients</option>
          </select>
        </div>

        <input type="text" placeholder="Search ingredient..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />

        <div className="results-summary">
          <p>Showing {filteredIngredients.length} {filterType.replace("-", " ")} ingredient{filteredIngredients.length !== 1 ? "s" : ""}{searchTerm && ` matching "${searchTerm}"`}</p>
        </div>

        {!filteredIngredients.length ? (
          <p className="no-ingredients">No matching ingredients found</p>
        ) : (
          <ul className="ingredients-list">
            {filteredIngredients.map((ingredient) => {
              const batchCounts = getBatchStatusCounts(ingredient.batches || []);
              const totalQuantity = getTotalQuantity(ingredient.batches || []);
              
              return (
                <li key={ingredient._id || ingredient.id} className="ingredient-item">
                  <div className="ingredient-header">
                    <h2>{ingredient.name}</h2>
                    <div className="ingredient-info">
                      <p className="unit">Unit: {unitLabels[ingredient.unit] || ingredient.unit}</p>
                      <p className="total-quantity">Total Quantity: {totalQuantity} {unitLabels[ingredient.unit] || ingredient.unit}</p>
                      
                      {ingredient.batches && ingredient.batches.length > 0 ? (
                        <div className="batch-summary">
                          <p className="batch-count">
                            {ingredient.batches.length} batch{ingredient.batches.length !== 1 ? "es" : ""}
                            {batchCounts.expired > 0 && <span className="expired-count"> • {batchCounts.expired} expired</span>}
                            {batchCounts.expiringSoon > 0 && <span className="expiring-count"> • {batchCounts.expiringSoon} expiring soon</span>}
                            {batchCounts.fresh > 0 && <span className="fresh-count"> • {batchCounts.fresh} fresh</span>}
                          </p>
                          <button className="btn-view-batches" onClick={() => handleShowBatches(ingredient)}>
                            View Batches
                          </button>
                        </div>
                      ) : (
                        <p className="no-batches">No batches available</p>
                      )}
                      
                      {ingredient.totalExpiredQuantity > 0 && (
                        <p className="expired-quantity">Total Expired: {ingredient.totalExpiredQuantity} {unitLabels[ingredient.unit] || ingredient.unit}</p>
                      )}
                    </div>
                  </div>
                  <button className="btn-delete" onClick={() => handleDeleteClick(ingredient._id || ingredient.id, ingredient.name)} disabled={deleteLoading === (ingredient._id || ingredient.id)}>
                    {deleteLoading === (ingredient._id || ingredient.id) ? "..." : "🗑️"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Batch Modal */}
      {batchModal.show && batchModal.ingredient && (
        <div className="modal-overlay">
          <div className="modal batch-modal">
            <div className="modal-header">
              <h3>Batches for {batchModal.ingredient.name}</h3>
              <button className="modal-close" onClick={closeBatchModal}>×</button>
            </div>
            <div className="modal-body">
              {!batchModal.ingredient.batches || batchModal.ingredient.batches.length === 0 ? (
                <p className="no-batches">No batches available for this ingredient.</p>
              ) : (
                <div className="batches-container">
                  {Object.entries(groupBatches(batchModal.ingredient.batches)).map(([status, batches]) => {
                    if (batches.length === 0) return null;
                    
                    return (
                      <div key={status} className={`batch-group batch-group-${status}`}>
                        <h4 className="batch-group-title">{statusLabels[status]} ({batches.length})</h4>
                        <div className="batch-list">
                          {batches
                            .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate))
                            .map((batch, index) => {
                              // Find the original index in the ingredient's batches array
                              const originalIndex = batchModal.ingredient.batches.findIndex(b => 
                                b.quantity === batch.quantity && 
                                b.expirationDate === batch.expirationDate
                              );
                              
                              return (
                                <div key={index} className={`batch-item batch-${status}`}>
                                  <div className="batch-details">
                                    <p className="batch-quantity">
                                      <strong>Quantity:</strong> {batch.quantity} {unitLabels[batchModal.ingredient.unit] || batchModal.ingredient.unit}
                                    </p>
                                    <p className="batch-expiry">
                                      <strong>Expires:</strong> {new Date(batch.expirationDate).toLocaleDateString()}
                                      {isBatchExpired(batch.expirationDate) && <span className="status-label expired"> (EXPIRED)</span>}
                                      {isBatchExpiringSoon(batch.expirationDate) && !isBatchExpired(batch.expirationDate) && <span className="status-label expiring"> (EXPIRING SOON)</span>}
                                    </p>
                                  </div>
                                  <button 
                                    className="btn-delete-batch" 
                                    onClick={() => deleteBatch(batchModal.ingredient._id || batchModal.ingredient.id, originalIndex)}
                                    title="Delete this batch"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeBatchModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><h3>Confirm Delete</h3></div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>"{deleteModal.ingredientName}"</strong>?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelDelete}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {authModal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><h3>Authentication Required</h3></div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-body">
                <p>Please enter your password to confirm deletion:</p>
                <input type="password" placeholder="Enter password" value={authModal.password} onChange={(e) => setAuthModal((prev) => ({ ...prev, password: e.target.value }))} required autoFocus className="auth-input" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelDelete} disabled={authModal.loading}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={authModal.loading}>{authModal.loading ? "Verifying..." : "Confirm Delete"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}