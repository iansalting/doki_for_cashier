import { useState, useEffect } from "react";
import axios from "axios";
import "./ingredientPage.css";
import { useNavigate } from "react-router-dom";

export default function Ingredient() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    ingredientId: null,
    ingredientName: "",
  });

  const [authModal, setAuthModal] = useState({
    show: false,
    password: "",
    loading: false,
    ingredientId: null,
    ingredientName: "",
  });

  const [deleteLoading, setDeleteLoading] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const unitLabels = {
    g: "Grams",
    kg: "Kilograms",
    ml: "Milliliters",
    l: "Liters",
    pcs: "Pieces",
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [navigate, token]);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("http://localhost:8000/api/ingredients/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setIngredients(response.data);
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const handleDeleteClick = (ingredientId, ingredientName) => {
    setDeleteModal({
      show: true,
      ingredientId: ingredientId,
      ingredientName: ingredientName,
    });
  };

  const confirmDelete = () => {
    setAuthModal({
      show: true,
      password: "",
      loading: false,
      ingredientId: deleteModal.ingredientId,
      ingredientName: deleteModal.ingredientName,
    });
    setDeleteModal({ show: false, ingredientId: null, ingredientName: "" });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthModal((prev) => ({ ...prev, loading: true }));

    try {
      const authResponse = await axios.post(
        "http://localhost:8000/api/auth/verify-user",
        {
          password: authModal.password,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (authResponse.data.success) {
        await performDelete();
      } else {
        alert(
          authResponse.data.message || "Invalid password. Please try again."
        );
        setAuthModal((prev) => ({ ...prev, loading: false }));
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        "Authentication failed. Please check your password.";
      alert(errorMessage);
      setAuthModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const performDelete = async () => {
    const ingredientId = authModal.ingredientId;
    setDeleteLoading(ingredientId);

    try {
      if (!ingredientId) {
        return;
      }

      await axios.delete(`http://localhost:8000/api/ingredients/delete/${ingredientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setIngredients((prev) => prev.filter((ingredient) => ingredient.id !== ingredientId));
      alert("Ingredient deleted successfully!");

      setAuthModal({
        show: false,
        password: "",
        loading: false,
        ingredientId: null,
        ingredientName: "",
      });
      setDeleteModal({ show: false, ingredientId: null, ingredientName: "" });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete ingredient");
    } finally {
      setDeleteLoading(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ show: false, ingredientId: null, ingredientName: "" });
    setAuthModal({
      show: false,
      password: "",
      loading: false,
      ingredientId: null,
      ingredientName: "",
    });
  };

  if (loading) return <div>Loading ingredients...</div>;
  if (error) return <div>Error: {error}</div>;

  const filteredIngredients = ingredients.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="ingredients-container">
      <div className="container-1">
        <h1>Storage</h1>

        <input
          type="text"
          placeholder="Search ingredient..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        {!filteredIngredients || filteredIngredients.length === 0 ? (
          <p>No matching ingredients found</p>
        ) : (
          <ul className="ingredients-list">
            {filteredIngredients.map((ingredient) => (
              <li key={ingredient.id} className="ingredient-item">
                <div className="ingredient-header">
                  <h2>{ingredient.name}</h2>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteClick(ingredient.id, ingredient.name)}
                    disabled={deleteLoading === ingredient.id}
                    title="Delete ingredient"
                  >
                    {deleteLoading === ingredient.id ? "..." : "🗑️"}
                  </button>
                </div>
                <p>Quantity: {ingredient.quantity}</p>
                <p>Unit: {unitLabels[ingredient.unit] || ingredient.unit}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {deleteModal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete{" "}
                <strong>"{deleteModal.ingredientName}"</strong>?
              </p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {authModal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Authentication Required</h3>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-body">
                <p>Please enter your password to confirm deletion:</p>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={authModal.password}
                  onChange={(e) =>
                    setAuthModal((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                  autoFocus
                  className="auth-input"
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelDelete}
                  disabled={authModal.loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={authModal.loading}
                >
                  {authModal.loading ? "Verifying..." : "Confirm Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}