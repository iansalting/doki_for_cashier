import { useState, useEffect } from "react";
import axios from "axios";
import "./ingredientPage.css";

export default function Ingredient() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");

  const token = localStorage.getItem("token");

    useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, []);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(
        "http://localhost:8000/api/ingredients/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
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

  const handleAddItem = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const response = await axios.post(
        "http://localhost:8000/api/ingredients/post",
        { name, unit },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setName("");
      setUnit("");
      setSuccessMessage(
        response.data.message || "Ingredient added successfully!"
      );
      fetchIngredients();
    } catch (error) {
      if (error.response) {
        setFormError(error.response.data.message);
      } else if (error.request) {
        setFormError("No response from server. Please check your network.");
      } else {
        setFormError("An unexpected error occurred.");
      }
    }
  };

  if (loading) return <div>Loading ingredients...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="ingredients-container">
      <div className="container-1">
        <h1>Ingredient List</h1>
        {!ingredients || ingredients.length === 0 ? (
          <p>No ingredients found</p>
        ) : (
          <ul className="ingredients-list">
            {ingredients.map((ingredient) => (
              <li key={ingredient.id} className="ingredient-item">
                <h2>{ingredient.name}</h2>
                <p>Quantity: {ingredient.quantity}</p>
                <p>Unit: {ingredient.unit}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="container-2">
        <h2>Add Ingredient</h2>
        <form onSubmit={handleAddItem}>
          <div>
            <label>
              Name:
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </label>
          </div>
          <div>
            <label>
              Unit:
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </label>
          </div>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Ingredient"}
          </button>
        </form>

        {successMessage && (
          <div style={{ color: "green" }}>{successMessage}</div>
        )}
        {formError && <div style={{ color: "red" }}>{formError}</div>}
      </div>
    </div>
  );
}
