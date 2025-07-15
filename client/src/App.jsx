import { BrowserRouter as Router, Routes, Route, useLocation} from "react-router-dom";
import {Dashboard, Login, Register, Orders, Inventory, Sales, Deliver } from "../pages/index.js";
import Navbar from "../components/Navbar.jsx";

function AppContent() {
  const location = useLocation();
  
  const hideNavbarRoutes = ['/', '/register'];
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname)

  return (
    <>
      {!shouldHideNavbar && <Navbar/>}
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/Orders" element={<Orders />} /> 
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/delivery" element={<Deliver />} />
        </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}


export default App;
