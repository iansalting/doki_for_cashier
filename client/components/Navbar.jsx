import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest(".navbar")) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();

    navigate("/");
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/orders", label: "Order" },
    {
      label: "Sales Report",
      dropdown: [
        { path: "/salesreport/storage", label: "Storage" },
        { path: "/salesreport/delivery", label: "Delivery" },
        { path: "/salesreport/sales", label: "Sales" },
        { path: "/salesreport/transactions", label: "Transaction History" },
      ],
    },
    {
      label: "Transactions",
      dropdown: [
        { path: "/Transaction/storage-transaction", label: "Add Item" },
        { path: "/Transaction/menulist-transaction", label: "Add Menu" },
        { path: "/Transaction/Images", label: "Upload Image" },
        { path: "/Transaction/delivery", label: "Add Delivery" },
      ],
    },
  ];

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/dashboard" className="nav-logo">
          DokiDoki
        </Link>
        <ul className={`nav-links ${isMenuOpen ? "active" : ""}`}>
          {navItems.map((item) => (
            <li key={item.label} className="nav-item">
              {item.dropdown ? (
                <div className="dropdown">
                  <button className="dropdown-toggle">{item.label}</button>
                  <ul className="dropdown-menu">
                    {item.dropdown.map((subItem) => (
                      <li key={subItem.path}>
                        <Link
                          to={subItem.path}
                          className={
                            location.pathname === subItem.path ? "active" : ""
                          }
                        >
                          {subItem.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={location.pathname === item.path ? "active" : ""}
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}

          <li>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </li>
        </ul>

        <button
          className={`nav-toggle ${isMenuOpen ? "active" : ""}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
