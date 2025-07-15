import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('.navbar')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    

    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/delivery', label: 'Delivery' },
    { path: '/inventory', label: 'Inventory' },
    { path: '/orders', label: 'Order' },
    { path: '/sales', label: 'Sales' }
  ];

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/dashboard" className="nav-logo">
          DokiDoki
        </Link>
        
        <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link 
                to={item.path}
                className={location.pathname === item.path ? 'active' : ''}
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <button 
              onClick={handleLogout}
              className="logout-btn"
            >
              Logout
            </button>
          </li>
        </ul>

        <button 
          className={`nav-toggle ${isMenuOpen ? 'active' : ''}`}
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