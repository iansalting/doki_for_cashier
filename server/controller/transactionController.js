import Transaction from "../model/TransactionModel.js";

const getAllCompletedTransactions = async (req, res, next) => {
    try {
        const completedTransactions = await Transaction.find({ status: 'completed' }).populate({
            path: 'orderId',
            model: 'Order',
            populate: {
                path: 'items.menuItem',
                model: 'Menu', 
                select: 'name price',
            }
        });

        if (completedTransactions.length === 0) return res.status(404).json({ message: 'No completed transactions found.' });
        

        return res.status(200).json(completedTransactions);
    } catch (error) {
        next(error); 
    }
}

const getAllTransactionByDate = async (req, res, next) => {
    try {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ message: 'Date parameter is required.' });
        }
        
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        const transactions = await Transaction.find({
            createdAt: { $gte: startDate, $lte: endDate }
        }).populate({
            path: 'orderId',
            model: 'Order',
            populate: {
                path: 'items.menuItem',
                model: 'Menu',
                select: 'name price',
            }
        });
        
        if (transactions.length === 0) {
            return res.status(404).json({ message: `No transactions found for date ${date}.` });
        }
        
        return res.status(200).json(transactions);
    } catch (error) {
        next(error);
    }
};

const getAllCancelledOrder = async (req, res, next) => {
    try {
        const cancelledTransaction = await Transaction.find({ status: 'cancelled' }).populate({
            path: 'orderId',
            model: 'Order',
            populate: {
                path: 'items.menuItem',
                model: 'Menu', 
                select: 'name price',
            }
        });

        if (cancelledTransaction.length === 0) return res.status(404).json({ message: 'No cancelled transactions found.' });
        

        return res.status(200).json(cancelledTransaction);
    } catch (error) {
        next(error)
    }
}


export { getAllCompletedTransactions, getAllTransactionByDate, getAllCancelledOrder}; 