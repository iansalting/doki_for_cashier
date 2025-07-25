import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import './addmenu.css'

export default function MenuPage() {
  const [ingredients, setIngredients] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    sizes: [],
  });

  const [sizeInput, setSizeInput] = useState({
    label: "",
    price: "",
    ingredients: [],
  });

  const [sizeIngredientInput, setSizeIngredientInput] = useState({
    selectedIngredient: "",
    quantity: "",
  });

  const [nonRamenIngredients, setNonRamenIngredients] = useState([]);
  const [nonRamenIngredientInput, setNonRamenIngredientInput] = useState({
    selectedIngredient: "",
    quantity: "",
  });

  const categoryOptions = [
    "ramen", "riceBowls", "drinks", "sides",
    "toppings", "desserts", "appetizers", "specials"
  ];

  const sizeOptions = ["Classic", "Deluxe", "Supreme"];

  const navigate = useNavigate();

  const getToken = () => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  };

  const token = getToken();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchIngredients();
  }, [token, navigate]);

  const fetchIngredients = async () => {
    if (!token) return;
    try {
      const response = await axios.get("http://localhost:8000/api/ingredients/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ingredientsData = response.data?.data || response.data || [];
      const validIngredients = Array.isArray(ingredientsData)
        ? ingredientsData.filter(ing => ing && (ing._id || ing.id))
        : [];
      setIngredients(validIngredients);
    } catch {
      alert("Failed to load ingredients. Please refresh the page.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "category") {
      setFormData(prev => ({ ...prev, [name]: value, sizes: [] }));
      setSizeInput({ label: "", price: "", ingredients: [] });
      setNonRamenIngredients([]);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addNonRamenIngredient = () => {
    if (!nonRamenIngredientInput.selectedIngredient || !nonRamenIngredientInput.quantity) {
      alert("Please select an ingredient and specify quantity.");
      return;
    }

    const selectedIngredientData = ingredients.find(
      (ing) => (ing._id || ing.id) === nonRamenIngredientInput.selectedIngredient
    );

    if (!selectedIngredientData) {
      alert("Selected ingredient not found.");
      return;
    }

    const exists = nonRamenIngredients.find(
      (ing) => ing.name === selectedIngredientData.name
    );

    if (exists) {
      alert("This ingredient is already added.");
      return;
    }

    const newIngredient = {
      name: selectedIngredientData.name,
      quantity: parseFloat(nonRamenIngredientInput.quantity),
    };

    setNonRamenIngredients([...nonRamenIngredients, newIngredient]);
    setNonRamenIngredientInput({ selectedIngredient: "", quantity: "" });
  };

  const removeNonRamenIngredient = (ingredientName) => {
    setNonRamenIngredients(
      nonRamenIngredients.filter((ing) => ing.name !== ingredientName)
    );
  };

  const addIngredientToSize = () => {
    const { selectedIngredient, quantity } = sizeIngredientInput;

    if (!selectedIngredient || !quantity) {
      alert("Please select an ingredient and specify quantity for the size.");
      return;
    }

    const ingredientData = ingredients.find(
      (ing) => (ing._id || ing.id) === selectedIngredient
    );

    if (!ingredientData) {
      alert("Selected ingredient not found.");
      return;
    }

    const exists = sizeInput.ingredients.find((ing) => ing.ingredient === selectedIngredient);
    if (exists) {
      alert("This ingredient is already added to this size.");
      return;
    }

    const newIngredient = {
      ingredient: selectedIngredient,
      name: ingredientData.name,
      quantity: parseFloat(quantity),
    };

    setSizeInput((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, newIngredient],
    }));

    setSizeIngredientInput({ selectedIngredient: "", quantity: "" });
  };

  const removeSizeIngredient = (ingredientId) => {
    setSizeInput((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((ing) => ing.ingredient !== ingredientId),
    }));
  };

  const addSizeToMenu = () => {
    if (!sizeInput.label || !sizeInput.price) {
      alert("Size label and price are required.");
      return;
    }

    if (isNaN(parseFloat(sizeInput.price)) || parseFloat(sizeInput.price) <= 0) {
      alert("Please enter a valid price.");
      return;
    }

    if (sizeInput.ingredients.length === 0) {
      alert("Please add at least one ingredient to this size.");
      return;
    }

    const exists = formData.sizes.find(size => size.label === sizeInput.label);
    if (exists) {
      alert(`Size "${sizeInput.label}" already exists. Please choose a different label.`);
      return;
    }

    const newSize = {
      label: sizeInput.label,
      price: parseFloat(sizeInput.price),
      ingredients: sizeInput.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity
      }))
    };

    setFormData((prev) => ({
      ...prev,
      sizes: [...prev.sizes, newSize],
    }));

    setSizeInput({ label: "", price: "", ingredients: [] });
  };

  const removeSize = (index) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Menu item name is required.");
      return;
    }

    if (!formData.category) {
      alert("Please select a category.");
      return;
    }

    let submitData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category,
    };

    if (formData.category === "ramen") {
      if (formData.sizes.length === 0) {
        alert("Please add at least one size for ramen items.");
        return;
      }
      submitData.sizes = formData.sizes;
    } else {
      if (!formData.price || parseFloat(formData.price) <= 0) {
        alert("Please enter a valid price.");
        return;
      }

      submitData.price = parseFloat(formData.price);

      if (nonRamenIngredients.length > 0) {
        submitData.sizes = [{
          ingredients: nonRamenIngredients
        }];
      }
    }

    try {
      await axios.post(
        "http://localhost:8000/api/menu/post",
        submitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      alert("Menu item added successfully!");

      setFormData({
        name: "",
        description: "",
        category: "",
        price: "",
        sizes: [],
      });
      setNonRamenIngredients([]);
      setSizeInput({ label: "", price: "", ingredients: [] });
    } catch (err) {
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to add menu item. Please try again.";
      alert(errorMessage);
    }
  };

  if (!token) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div className="menu-container">
      <h1>Menu Management</h1>
      <form className="menu-form" onSubmit={handleSubmit}>
        <h2>Add New Menu Item</h2>

        <div className="form-row">
          <input
            type="text"
            name="name"
            placeholder="Menu Item Name"
            value={formData.name}
            onChange={handleInputChange}
            required
            className="form-input"
          />
          {formData.category !== "ramen" && (
            <input
              type="number"
              name="price"
              placeholder="Price (Php)"
              value={formData.price}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              required={formData.category !== "ramen"}
              className="form-input"
            />
          )}
        </div>

        <textarea
          name="description"
          placeholder="Description (optional)"
          value={formData.description}
          onChange={handleInputChange}
          rows="3"
          className="form-textarea"
        />

        <select 
          name="category" 
          value={formData.category} 
          onChange={handleInputChange} 
          required
          className="form-select"
        >
          <option value="">Select category...</option>
          {categoryOptions.map((cat) => (
            <option key={`category-${cat}`} value={cat}>
              {cat.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
            </option>
          ))}
        </select>

        {/* Non-ramen ingredients section */}
        {formData.category && formData.category !== "ramen" && (
          <div className="ingredient-section">
            <h3>Ingredients (Optional)</h3>

            <div className="ingredient-inputs">
              <select
                value={nonRamenIngredientInput.selectedIngredient}
                onChange={(e) => {
                  setNonRamenIngredientInput({
                    ...nonRamenIngredientInput, 
                    selectedIngredient: e.target.value
                  });
                }}
                className="form-select"
              >
                <option value="">Select ingredient...</option>
                {ingredients.map((ingredient, index) => {
                  const ingredientId = ingredient._id || ingredient.id;
                  return (
                    <option key={`ingredient-${ingredientId || index}`} value={ingredientId}>
                      {ingredient.name} (Available: {ingredient.quantity || 0} {ingredient.unit || "units"})
                    </option>
                  );
                })}
              </select>
              <input
                type="number"
                placeholder="Quantity"
                value={nonRamenIngredientInput.quantity}
                min="0.01"
                step="0.01"
                onChange={(e) => {
                  setNonRamenIngredientInput({
                    ...nonRamenIngredientInput, 
                    quantity: e.target.value
                  });
                }}
                className="form-input"
              />
              <button
                type="button"
                onClick={addNonRamenIngredient}
                disabled={!nonRamenIngredientInput.selectedIngredient || !nonRamenIngredientInput.quantity}
                className="btn btn-secondary"
              >
                Add
              </button>
            </div>

            {nonRamenIngredients.length > 0 && (
              <div className="ingredients-list">
                <h4>Added Ingredients:</h4>
                <ul>
                  {nonRamenIngredients.map((ing, index) => (
                    <li key={`non-ramen-${index}`} className="ingredient-item">
                      <span>{ing.name} - Qty: {ing.quantity}</span>
                      <button 
                        type="button" 
                        onClick={() => removeNonRamenIngredient(ing.name)}
                        className="btn btn-danger btn-small"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Ramen sizes section */}
        {formData.category === "ramen" && (
          <div className="ramen-sizes">
            <h3>Add Size</h3>
            <div className="size-inputs">
              <select
                value={sizeInput.label}
                onChange={(e) => setSizeInput({ ...sizeInput, label: e.target.value })}
                className="form-select"
              >
                <option value="">Select size...</option>
                {sizeOptions.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Price for this size"
                value={sizeInput.price}
                step="0.01"
                min="0"
                onChange={(e) => setSizeInput({ ...sizeInput, price: e.target.value })}
                className="form-input"
              />
            </div>

            <h4>Add Ingredients to Size</h4>
            <div className="ingredient-inputs">
              <select
                value={sizeIngredientInput.selectedIngredient}
                onChange={(e) =>
                  setSizeIngredientInput({
                    ...sizeIngredientInput,
                    selectedIngredient: e.target.value,
                  })
                }
                className="form-select"
              >
                <option value="">Select ingredient for this size...</option>
                {ingredients.map((ingredient, index) => {
                  const ingredientId = ingredient._id || ingredient.id;
                  return (
                    <option key={`size-ingredient-${ingredientId || index}`} value={ingredientId}>
                      {ingredient.name}
                    </option>
                  );
                })}
              </select>
              <input
                type="number"
                placeholder="Quantity"
                value={sizeIngredientInput.quantity}
                step="0.01"
                min="0"
                onChange={(e) =>
                  setSizeIngredientInput({ ...sizeIngredientInput, quantity: e.target.value })
                }
                className="form-input"
              />
              <button 
                type="button" 
                onClick={addIngredientToSize}
                className="btn btn-success"
              >
                Add to Size
              </button>
            </div>

            {sizeInput.ingredients.length > 0 && (
              <div className="size-ingredients">
                <h4>Ingredients for this size:</h4>
                <ul>
                  {sizeInput.ingredients.map((ing) => (
                    <li key={`size-ing-${ing.ingredient}`} className="ingredient-item">
                      <span>{ing.name} - {ing.quantity}</span>
                      <button 
                        type="button" 
                        onClick={() => removeSizeIngredient(ing.ingredient)}
                        className="btn btn-danger btn-small"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button 
              type="button" 
              onClick={addSizeToMenu}
              disabled={!sizeInput.label || !sizeInput.price || sizeInput.ingredients.length === 0}
              className="btn btn-info"
            >
              Add Size to Menu
            </button>

            {formData.sizes.length > 0 && (
              <div className="added-sizes">
                <h4>Added Sizes:</h4>
                <ul>
                  {formData.sizes.map((size, i) => (
                    <li key={`added-size-${i}-${size.label}`} className="size-item">
                      <span>
                        <strong>{size.label}</strong> - ₱{size.price} 
                        ({size.ingredients.length} ingredient(s))
                      </span>
                      <button 
                        type="button" 
                        onClick={() => removeSize(i)}
                        className="btn btn-danger"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <button 
          type="submit" 
          disabled={!formData.name || !formData.category}
          className="btn btn-primary btn-submit"
        >
          Add Menu Item
        </button>
      </form>
    </div>
  );
}