import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import './additem.css'

export default function Ingredient() {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [navigate, token]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const response = await axios.post(
        "http://localhost:8000/api/ingredients/",
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
      setSuccessMessage(response.data.message || "Ingredient added successfully!");
    } catch (error) {
      if (error.response) {
        setFormError(error.response.data.message);
      } else if (error.request) {
        setFormError("No response from server. Please check your network.");
      } else {
        setFormError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-ingredient-container">
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
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
              disabled={isSubmitting}
            >
              <option value="">-- Select Unit --</option>
              <option value="g">Grams (g)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="ml">Milliliters (ml)</option>
              <option value="l">Liters (l)</option>
              <option value="pcs">Pieces (pcs)</option>
            </select>
          </label>
        </div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Ingredient"}
        </button>
      </form>

      {successMessage && <div style={{ color: "green" }}>{successMessage}</div>}
      {formError && <div style={{ color: "red" }}>{formError}</div>}
    </div>
  );
}
