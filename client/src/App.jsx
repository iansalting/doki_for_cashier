import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Dashboard, Orders, Login, Register, Inventory } from "../pages/index.js";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/Orders" element={<Orders />} /> 
          <Route path="/inventory" element={<Inventory />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
