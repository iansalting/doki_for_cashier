import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import {
  Dashboard,
  Login,
  AddMenu,
  AddITem,
  Orders,
  Inventory,
  Sales,
  Deliver,
  DeliveryTransaction,
  Transaction,
  Images,
} from "../pages/index.js";
import Navbar from "../components/Navbar.jsx";

function AppContent() {
  const location = useLocation();

  const hideNavbarRoutes = ["/", "/register"];
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/Orders" element={<Orders />} />
        <Route path="/salesreport/storage" element={<Inventory />} />
        <Route path="/salesreport/menulist" element={<Inventory />} />
        <Route path="/salesreport/sales" element={<Sales />} />
        <Route path="/salesreport/transactions" element={<Transaction />} />
        <Route path="/salesreport/delivery" element={<Deliver />} />
        <Route path="/Transaction/delivery" element={<DeliveryTransaction />} />
        <Route path="/Transaction/storage-transaction" element={<AddITem />} />
        <Route path="/Transaction/menulist-transaction" element={<AddMenu />} />
        <Route path="/Transaction/images" element={<Images />} />
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
