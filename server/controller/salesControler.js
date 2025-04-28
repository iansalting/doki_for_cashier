import Transaction from "../model/TransactionModel.js";

const getTopSales = async (req, res, next) => {
  try {
    const topSales = await Transaction.aggregate([
      {
        $match: { status: "completed" },
      },
      {
        $group: {
          _id: {
            orderId: "$orderId",
            menuName: "$name",
          },
          totalAmount: { $sum: "$amount" },
          transactionDetails: { $push: "$$ROOT" },
        },
      },
      {
        $sort: {
          totalAmount: -1,
        },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          _id: 0,
          orderId: "$_id",
          totalAmount: 1,
          transactionDetails: 1,
        },
      },
    ]);
    return res.status(200).json(topSales);
  } catch (error) {
    next(error);
  }
};

const getMonthlySales = async (req, res, next) => {
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );
  const endOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  );

  try {
    const monthlyRevenue = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        },
      },
      {
        $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
        }
      }
    ]);
    res.status(200).json(monthlyRevenue[0] ? monthlyRevenue[0].totalRevenue : 0);
  } catch (error) {
    next(error);
  }
};

const getDailySales = async (req, res, next) => {
    const startOfDay = new Date(new Date().setHours(0,0,0,0));
    const endOfDay = new Date(new Date().setHours(23,59,59,999));

    try {
        const dailyRevenue = await Transaction.aggregate([
            {
                $match: {
                    date: {
                        $gte: startOfDay, 
                        $lte: endOfDay
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amount" }
                }
            }
        ]);
        res.status(200).json(dailyRevenue[0] ? dailyRevenue[0].totalRevenue : 0)
    } catch (error) {
        next(error)
    }
};

const getMonthlyMenuItemSales = async (req, res, next) => {
    try {
        
    } catch (error) {
        next(error)
    }
};

export { getTopSales, getDailySales, getMonthlySales,getMonthlyMenuItemSales };