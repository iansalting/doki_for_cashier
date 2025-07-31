import { useEffect, useState } from "react";
import axios from "axios";
import './image.css'

const BASE_URL = "http://localhost:8000";

export default function ImageUpload() {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [menuItem, setMenuItem] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Get fresh token and check auth
  const getToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      return null;
    }
    return token;
  };

  // Handle auth errors
  const handleAuthError = (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem("token"); // Clear invalid token
      setIsAuthenticated(false);
      setError("Session expired. Please login again.");
      return true;
    }
    return false;
  };

  // Fetch all menu items
  useEffect(() => {
    const fetchMenus = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const res = await axios.get(`${BASE_URL}/api/menu-items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenuItems(res.data);
        setError(""); // Clear any previous errors
      } catch (err) {
        if (!handleAuthError(err)) {
          setError("Failed to fetch menu items");
        }
      }
    };
    fetchMenus();
  }, []);

  // Fetch specific selected item
  useEffect(() => {
    if (!selectedId) return;
    
    const fetchMenuItem = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const res = await axios.get(`${BASE_URL}/api/menu-items/${selectedId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenuItem(res.data);
        setError("");
      } catch (err) {
        if (!handleAuthError(err)) {
          setError("Failed to fetch menu item");
        }
      }
    };
    fetchMenuItem();
  }, [selectedId]);

  const handleUpload = async () => {
    if (!imageFile || !selectedId) {
      setError("Please select an item and image");
      return;
    }

    const token = getToken();
    if (!token) return;

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("imageAlt", `Image of ${menuItem?.name || "menu item"}`);

    try {
      const res = await axios.post(
        `${BASE_URL}/api/menu-items/${selectedId}/image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage("Image uploaded successfully");
      setError("");
      setMenuItem(res.data.menuItem);
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.message || "Upload failed");
        setMessage("");
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !window.confirm("Delete this image?")) return;

    const token = getToken();
    if (!token) return;

    try {
      const res = await axios.delete(
        `${BASE_URL}/api/menu-items/${selectedId}/image`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage("Image deleted successfully");
      setError("");
      setMenuItem(res.data.menuItem);
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.message || "Delete failed");
        setMessage("");
      }
    }
  };

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="image-upload-container">
        <h2>Authentication Required</h2>
        <p>UNAUTHORIZED</p>
        <button onClick={() => window.location.href = '/'}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="image-upload-container">
      <h2>Upload Image for Menu Item</h2>

      {/* Menu selection dropdown */}
      <select
        onChange={(e) => setSelectedId(e.target.value)}
        value={selectedId || ""}
      >
        <option value="" disabled>
          -- Select Menu Item --
        </option>
        {menuItems.map((item) => (
          <option key={item._id} value={item._id}>
            {item.name}
          </option>
        ))}
      </select>

      {selectedId && (
        <>
          {menuItem?.imageUrl ? (
            <div className="image-preview">
              <img
                src={menuItem.imageUrl}
                alt={menuItem.imageAlt}
              />
              <div className="button-container">
                <button className="delete-button" onClick={handleDelete}>Delete Image</button>
                <button className="upload-button" onClick={handleUpload}>Upload Image</button>
              </div>
            </div>
          ) : (
            <>
              <p>No image uploaded for this item.</p>
              <div className="button-container">
                <button className="upload-button" onClick={handleUpload}>Upload Image</button>
              </div>
            </>
          )}

          <input type="file" onChange={(e) => setImageFile(e.target.files[0])} />
        </>
      )}

      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}