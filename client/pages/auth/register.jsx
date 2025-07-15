import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./register.css";
import axios from "axios";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "admin",
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:8000/api/auth/register",
        formData
      );
      setMessage(res.data.message);
      setFormData({ username: "", password: "", role: "admin" });
      navigate("/");
    } catch (error) {
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setMessage(error.response.data.message);
      } else {
        setMessage("An error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Register</h2>
        {message && <p className="message">{message}</p>}

        <label>Username</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          required
        />

        <label>Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />

        <label>Role</label>
        <select name="role" value={formData.role} onChange={handleInputChange}>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>

        <button type="submit">Register</button>

        <p className="login-link">
          Already have an account? <a href="/">Login here</a>
        </p>
      </form>
    </div>
  );
}
