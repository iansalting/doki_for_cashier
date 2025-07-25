import { useState } from "react";
import IngredientPage from "./ingredientPage.jsx";
import MenuPage from "./menupage.jsx";
import './inventory.css';

export default function InventoryAndMenuView() {
  const [selectedPage, setSelectedPage] = useState("ingredients");

  return (
    <div className="inventory-wrapper">
      <div className="inventory-view-selector">
        <label htmlFor="page-select">Select View:</label>
        <select
          id="page-select"
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
        >
          <option value="ingredients">Storage</option>
          <option value="menu">Menu List</option>
        </select>
      </div>

      <div className="inventory-page">
        {selectedPage === "ingredients" ? <IngredientPage /> : <MenuPage />}
      </div>
    </div>
  );
}
