import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

import "./sales.css";

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
  const MONTHLY_SALES_API = `http://localhost:8000/view/superadmin/Sales/monthly?year=${selectedYear}`;

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchTopSales = async () => {
      try {
        setLoadingTop(true);
        const response = await fetch(TOP_SALES_API, {
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
          <p>Price: ₱{data.itemPrice}</p>
          <p>Qty Sold: {data.totalQuantitySold}</p>
          <p>
            Total Revenue: ₱
            {data.totalRevenue ? data.totalRevenue.toFixed(2) : "N/A"}
          </p>
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
          <div className="sales-spinner" />
        </div>
      ) : errorDaily ? (
        <div className="sales-error">Error: {errorDaily}</div>
      ) : (
        <div className="sales-summary-cards">
          <div className="sales-card total">
            <h3>Total Sales</h3>
            <p>₱{dailySales.data.overall.totalSales.toFixed(2)}</p>
            <span>{dailySales.data.overall.totalOrders} Orders</span>
          </div>
          <div className="sales-card online">
            <h3>Online (Users)</h3>
            <p>
              ₱
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
              ₱
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
          <div className="sales-spinner" />
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

      {/* Monthly Sales Line Graph */}
      <h2 className="sales-title">📈 Monthly Sales Overview</h2>
      <div className="sales-year-selector">
        <label htmlFor="year">Select Year:</label>
        <input
          type="number"
          id="year"
          min="2000"
          max="3000"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        />
      </div>

      {monthlyLoading ? (
        <div className="sales-loading">
          <div className="sales-spinner" />
        </div>
      ) : monthlyError ? (
        <div className="sales-error">Error: {monthlyError}</div>
      ) : (
        <>
          <div style={{ height: "400px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlySales}
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalRevenue"
                  stroke="#10B981"
                  name="Total Revenue"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalOrders"
                  stroke="#3B82F6"
                  name="Total Orders"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="averageOrderValue"
                  stroke="#F59E0B"
                  name="Avg Order Value"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="sales-summary">
            <h3>📊 Yearly Summary for {selectedYear}</h3>
            <p>
              <strong>Total Revenue:</strong> ₱
              {monthlySummary?.totalYearlyRevenue != null
                ? monthlySummary.totalYearlyRevenue.toFixed(2)
                : "N/A"}
            </p>
            <p>
              <strong>Total Orders:</strong>{" "}
              {monthlySummary?.totalYearlyOrders != null
                ? monthlySummary.totalYearlyOrders
                : "N/A"}
            </p>
            <p>
              <strong>Avg Order Value:</strong> ₱
              {monthlySummary?.averageOrderValue != null
                ? monthlySummary.averageOrderValue.toFixed(2)
                : "N/A"}
            </p>
            <p>
              <strong>Revenue Growth:</strong>{" "}
              {monthlySummary?.revenueGrowth != null
                ? monthlySummary.revenueGrowth
                : "N/A"}
              %
            </p>
            <p>
              <strong>Order Growth:</strong>{" "}
              {monthlySummary?.orderGrowth != null
                ? monthlySummary.orderGrowth
                : "N/A"}
              %
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Sales;