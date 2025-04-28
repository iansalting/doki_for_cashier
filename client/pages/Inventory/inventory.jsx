import { useState, useEffect } from "react";

export default function Inventory() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [delivery, setDelivery] = useState({
    suplier: "",
    items: [{ ingredient: "", quantity: 0 }]
  })

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const response = await fetch(
          "http://localhost:8000/api/ingredients/"
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setIngredients(data);
        setLoading(false);
      } catch (error) {
        setError("Failed to load ingredients");
        setLoading(false);
      }
    };
    fetchIngredients();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage("");

    try {
      const response = await fetch(
        "http://localhost:8000/api/ingredients/post",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, unit }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add ingredient");
      }

      setName("");
      setUnit("");
      setSuccessMessage(data.message);

      setIngredients((prev) => [
        ...prev,
        {
          id: data.data.id,
          name: data.data.name,
          unit: data.data.unit,
          quantity: data.data.quantity || 0,
        },
      ]);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div>Loading ingredients...</div>;
  if (error) return <div>Error: {error}</div>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/superadmin/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delivery)
      });

      if (!res.ok) throw new Error("Delivery failed");
      
      setSuccessMessage("Delivery recorded!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setDelivery({ supplier: "", items: [{ ingredient: "", quantity: 0 }] });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="ingredients-container">
      <div className="container-1">
        <h1>Ingredient List</h1>
        {ingredients.length === 0 ? (
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
        {successMessage && <div style={{ color: "green" }}>{successMessage}</div>}
        {error && <div style={{ color: "red" }}>{error}</div>}
      </div>
    </div>
  );
}
