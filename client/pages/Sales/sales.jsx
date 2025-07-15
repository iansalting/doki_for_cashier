import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "./sales.css"; // Make sure you include styles for both parts

const Sales = () => {
  const [topSales, setTopSales] = useState([]);
  const [dailySales, setDailySales] = useState(null);
  const [loadingTop, setLoadingTop] = useState(true);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [errorTop, setErrorTop] = useState(null);
  const [errorDaily, setErrorDaily] = useState(null);
  const [monthlySales, setMonthlySales] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const TOP_SALES_API = "http://localhost:8000/view/superadmin/sales/";
  const DAILY_SALES_API = "http://localhost:8000/view/superadmin/sales/daily";
  const MONTHLY_SALES_API = `http://localhost:8000/view/superadmin/monthly-sales?year=${selectedYear}`;

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchTopSales = async () => {
      try {
        setLoadingTop(true);
        const response = await fetch(TOP_SALES_API, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();
        if (result.success) {
          const sorted = result.data
            .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
            .slice(0, 5);
          setTopSales(sorted);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        setErrorTop(err.message);
      } finally {
        setLoadingTop(false);
      }
    };

    const fetchDailySales = async () => {
      try {
        setLoadingDaily(true);
        const response = await fetch(DAILY_SALES_API, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();
        if (result.success) {
          setDailySales(result);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        setErrorDaily(err.message);
      } finally {
        setLoadingDaily(false);
      }
    };

    fetchTopSales();
    fetchDailySales();
  }, [token]);

  useEffect(() => {
  const fetchMonthlySales = async () => {
    try {
      setMonthlyLoading(true);
      const response = await fetch(MONTHLY_SALES_API, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setMonthlySales(result.data.monthlySales);
        setMonthlySummary(result.data.summary);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setMonthlyError(err.message);
    } finally {
      setMonthlyLoading(false);
    }
  };

  fetchMonthlySales();
}, [selectedYear, token]);

  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="sales-tooltip">
          <p className="font-semibold">{label}</p>
          <p>Category: {data.category}</p>
          <p>Price: ${data.itemPrice}</p>
          <p>Qty Sold: {data.totalQuantitySold}</p>
          <p>Total Revenue: ${data.totalRevenue.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="sales-container">
      {/* Daily Sales Summary */}
      <h2 className="sales-title">📆 Daily Sales Summary</h2>
      {loadingDaily ? (
        <div className="sales-loading">
          <div className="sales-spinner"></div>
        </div>
      ) : errorDaily ? (
        <div className="sales-error">Error: {errorDaily}</div>
      ) : (
        <div className="sales-summary-cards">
          <div className="sales-card total">
            <h3>Total Sales</h3>
            <p>${dailySales.data.overall.totalSales.toFixed(2)}</p>
            <span>{dailySales.data.overall.totalOrders} Orders</span>
          </div>
          <div className="sales-card online">
            <h3>Online (Users)</h3>
            <p>
              $
              {dailySales.data.userOrders
                .reduce((sum, u) => sum + u.totalSales, 0)
                .toFixed(2)}
            </p>
            <span>
              {dailySales.data.userOrders.reduce(
                (sum, u) => sum + u.totalOrders,
                0
              )}{" "}
              Orders
            </span>
          </div>
          <div className="sales-card cashier">
            <h3>Cashier (Tables)</h3>
            <p>
              $
              {dailySales.data.cashierOrders
                .reduce((sum, c) => sum + c.totalSales, 0)
                .toFixed(2)}
            </p>
            <span>
              {dailySales.data.cashierOrders.reduce(
                (sum, c) => sum + c.totalOrders,
                0
              )}{" "}
              Orders
            </span>
          </div>
        </div>
      )}

      {/* Top 5 Best-Selling Items */}
      <h2 className="sales-title">🔥 Top 5 Best-Selling Items</h2>
      {loadingTop ? (
        <div className="sales-loading">
          <div className="sales-spinner"></div>
        </div>
      ) : errorTop ? (
        <div className="sales-error">Error: {errorTop}</div>
      ) : (
        <div style={{ height: "24rem" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topSales}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="itemName" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalQuantitySold" fill="#3B82F6">
                {topSales.map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
    </div>
  );
  
};

export default Sales;
