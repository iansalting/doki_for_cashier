import { useState } from "react";
import IngredientPage from "./ingredientPage.jsx";
import MenuPage from "./menuPage.jsx";
import './inventory.css'

export default function InventoryAndMenuView() {
  
  const [selectedPage, setSelectedPage] = useState("ingredients");


  return (
    <div className="main-container">
      <div className="view-selector">
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

      {selectedPage === "ingredients" ? <IngredientPage /> : <MenuPage />}
    </div>
  );
}
