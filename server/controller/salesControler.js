import Order from "../model/orderModel.js";

const getTopSales = async (req, res) => {
  try {
    const topItems = await Order.aggregate([
      {
        $match: {
          status: "completed",
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: "$items.menuItem",
          totalQuantitySold: { $sum: "$items.quantity" },
          totalOrders: { $sum: 1 },
          averageQuantityPerOrder: { $avg: "$items.quantity" },
        },
      },
      {
        $lookup: {
          from: "menus",
          localField: "_id",
          foreignField: "_id",
          as: "menuDetails",
        },
      },
      {
        $unwind: "$menuDetails",
      },
      {
        $project: {
          _id: 1,
          itemName: "$menuDetails.name",
          itemPrice: "$menuDetails.price",
          category: "$menuDetails.category",
          totalQuantitySold: 1,
          totalOrders: 1,
          averageQuantityPerOrder: { $round: ["$averageQuantityPerOrder", 2] },
          totalRevenue: {
            $multiply: ["$totalQuantitySold", "$menuDetails.price"],
          },
        },
      },
      {
        $sort: { totalQuantitySold: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Top 5 best-selling items retrieved successfully",
      data: topItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching top selling items",
      error: error.message,
    });
  }
};

const getDailySales = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          status: "completed",
        },
      },
      {
        $facet: {
          // Overall sales
          overall: [
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$bills.total" },
                totalOrders: { $sum: 1 },
                averageOrderValue: { $avg: "$bills.total" },
              },
            },
          ],

          // User Orders (orders placed by registered users)
          userOrders: [
            {
              $match: {
                users: { $exists: true, $ne: null },
              },
            },
            {
              $group: {
                _id: "$users",
                totalSales: { $sum: "$bills.total" },
                totalOrders: { $sum: 1 },
                averageOrderValue: { $avg: "$bills.total" },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "userInfo",
              },
            },
            { $unwind: "$userInfo" },
            {
              $project: {
                userName: "$userInfo.name",
                userEmail: "$userInfo.email",
                totalSales: 1,
                totalOrders: 1,
                averageOrderValue: { $round: ["$averageOrderValue", 2] },
              },
            },
            { $sort: { totalSales: -1 } },
          ],

          // Cashier Orders (orders placed at tables)
          cashierOrders: [
            {
              $match: {
                tableNumber: { $exists: true, $ne: null },
              },
            },
            {
              $group: {
                _id: "$tableNumber",
                totalSales: { $sum: "$bills.total" },
                totalOrders: { $sum: 1 },
                averageOrderValue: { $avg: "$bills.total" },
              },
            },
            {
              $project: {
                tableNumber: "$_id",
                totalSales: 1,
                totalOrders: 1,
                averageOrderValue: { $round: ["$averageOrderValue", 2] },
                _id: 0,
              },
            },
            { $sort: { totalSales: -1 } },
          ],
        },
      },
    ]);

    const result = salesData[0];
    const overallResult =
      result.overall.length > 0
        ? result.overall[0]
        : { totalSales: 0, totalOrders: 0, averageOrderValue: 0 };

    res.status(200).json({
      success: true,
      date: today.toDateString(),
      data: {
        overall: {
          ...overallResult,
          averageOrderValue:
            Math.round(overallResult.averageOrderValue * 100) / 100,
        },
        userOrders: result.userOrders,
        cashierOrders: result.cashierOrders,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching today's sales",
      error: error.message,
    });
  }
};

const getMonthlySales = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const targetYear = parseInt(year);

    if (isNaN(targetYear) || targetYear < 1900 || targetYear > 3000) {
      return res.status(400).json({
        success: false,
        message: "Invalid year parameter",
      });
    }

    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const monthlySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lte: endOfYear },
          status: "completed",
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalRevenue: { $sum: "$bills.total" },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: "$bills.total" },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          monthName: {
            $arrayElemAt: [
              [
                "",
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ],
              "$_id.month",
            ],
          },
          totalRevenue: { $round: ["$totalRevenue", 2] },
          totalOrders: "$totalOrders",
          averageOrderValue: { $round: ["$averageOrderValue", 2] },
        },
      },
    ]);

    // Month names array
    const monthNames = [
      "",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const allMonths = [];
    for (let month = 1; month <= 12; month++) {
      const existingMonth = monthlySales.find(
        (sale) => sale.month === month && sale.year === targetYear
      );

      if (existingMonth) {
        allMonths.push(existingMonth);
      } else {
        allMonths.push({
          year: targetYear,
          month: month,
          monthName: monthNames[month],
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
        });
      }
    }

    // Calculate yearly totals
    const totalYearlyRevenue = allMonths.reduce(
      (sum, month) => sum + month.totalRevenue,
      0
    );
    const totalYearlyOrders = allMonths.reduce(
      (sum, month) => sum + month.totalOrders,
      0
    );
    const averageYearlyOrder =
      totalYearlyOrders > 0 ? totalYearlyRevenue / totalYearlyOrders : 0;

    // Get previous year data for comparison
    const previousYear = targetYear - 1;
    const previousYearStart = new Date(previousYear, 0, 1);
    const previousYearEnd = new Date(previousYear, 11, 31, 23, 59, 59, 999);

    const previousYearTotal = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousYearStart, $lte: previousYearEnd },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$bills.total" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const prevYearData = previousYearTotal[0] || {
      totalRevenue: 0,
      totalOrders: 0,
    };
    const revenueGrowth =
      prevYearData.totalRevenue > 0
        ? ((totalYearlyRevenue - prevYearData.totalRevenue) /
            prevYearData.totalRevenue) *
          100
        : 0;

    const orderGrowth =
      prevYearData.totalOrders > 0
        ? ((totalYearlyOrders - prevYearData.totalOrders) /
            prevYearData.totalOrders) *
          100
        : 0;

    res.status(200).json({
      success: true,
      data: {
        year: targetYear,
        monthlySales: allMonths,
        summary: {
          totalYearlyRevenue: Math.round(totalYearlyRevenue * 100) / 100,
          totalYearlyOrders: totalYearlyOrders,
          averageOrderValue: Math.round(averageYearlyOrder * 100) / 100,
          revenueGrowth: Math.round(revenueGrowth * 100) / 100,
          orderGrowth: Math.round(orderGrowth * 100) / 100,
        },
        comparison: {
          currentYear: {
            revenue: Math.round(totalYearlyRevenue * 100) / 100,
            orders: totalYearlyOrders,
          },
          previousYear: {
            revenue: Math.round(prevYearData.totalRevenue * 100) / 100,
            orders: prevYearData.totalOrders,
          },
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching monthly sales",
      error: error.message,
    });
  }
};

const getSalesForDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date parameter is required (YYYY-MM-DD format)",
      });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate() + 1
    );

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$bills.total" },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: "$bills.total" },
        },
      },
    ]);

    const result = salesData[0] || {
      totalSales: 0,
      totalOrders: 0,
      averageOrderValue: 0,
    };

    res.status(200).json({
      success: true,
      date: targetDate.toDateString(),
      data: {
        totalSales: Math.round(result.totalSales * 100) / 100,
        totalOrders: result.totalOrders,
        averageOrderValue: Math.round(result.averageOrderValue * 100) / 100,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sales for date",
      error: error.message,
    });
  }
};

export { getTopSales, getDailySales, getMonthlySales, getSalesForDate };