import createHttpError from "http-errors";
import Order from "../model/orderModel.js";
import Menu from "../model/menuModel.js";
import mongoose from "mongoose";
import Ingredient from "../model/ingredientModel.js";
import Transaction from "../model/TransactionModel.js";

const addOrder = async (req, res, next) => {
  try {
    const { tableNumber, items } = req.body;

    if (!items || items.length === 0) {
      return next(createHttpError(400, "Order must contain at least one item"));
    }

    let total = 0;
    const ingredientUpdate = {};

    const menuItems = await Menu.find({
      _id: { $in: items.map((item) => item.menuItem) },
    }).populate("ingredients.ingredient");

    for (const item of items) {
      const menuItem = menuItems.find((m) => m._id.equals(item.menuItem));
      if (!menuItem) {
        return next(createHttpError(404, `Menu item ${item.menuItem} not found`));
      }

      total += menuItem.price * item.quantity;

      for (const ingredient of menuItem.ingredients) {
        const requiredAmount = ingredient.quantity * item.quantity;
        if (ingredientUpdate[ingredient.ingredient._id]) {
          ingredientUpdate[ingredient.ingredient._id] += requiredAmount;
        } else {
          ingredientUpdate[ingredient.ingredient._id] = requiredAmount;
        }
      }
    }

    const ingredientIds = Object.keys(ingredientUpdate);
    const ingredients = await Ingredient.find({ _id: { $in: ingredientIds } });

    for (const ingredient of ingredients) {
      const requiredAmount = ingredientUpdate[ingredient._id];
      if (ingredient.quantity < requiredAmount) {
        throw new Error(
          `Not enough ${ingredient.name} in stock. Need ${requiredAmount}${ingredient.unit} but only have ${ingredient.quantity}${ingredient.unit}`
        );
      }
    }

    const newOrder = new Order({
      tableNumber,
      status: "pending",
      orderDate: new Date(),
      bills: {
        total,
      },
      items,
    });

    await newOrder.save();

    const populatedOrder = await Order.findById(newOrder._id).populate({
      path: "items.menuItem",
      populate: {
        path: "ingredients.ingredient",
      },
    });

    const receiptDetails = {
      tableNumber: populatedOrder.tableNumber,
      orderDate: populatedOrder.orderDate,
      items: populatedOrder.items.map((item) => ({
        menuItem: item.menuItem.name,
        quantity: item.quantity,
        price: item.menuItem.price,
      })),
      total: populatedOrder.bills.total,
    };

    res.status(201).json(receiptDetails);
  } catch (error) {
    next(error);
  }
};


const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: "items.menuItem",
      populate: {
        path: "ingredients.ingredient",
      },
    });
    if (!order) return next(createHttpError(404, "Order not found"));

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "items.menuItem",
        populate: {
          path: "ingredients.ingredient",
        },
      })
      .sort({ orderDate: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    if (!status || !["pending", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Valid status is required" });
    }


    const order = await Order.findById(id).populate({
      path: "items.menuItem",
    });
    
    if (!order) return next(createHttpError(404, "Order not found"));
    

    const newTransaction = new Transaction({
      orderId: order._id,
      type: "order_status_updated",
      status,
      amount: order.bills.total,
      date: new Date(),
      details: {
        previousStatus: order.status,
        tableNumber: order.tableNumber,
        orderDate: order.orderDate,
        bills: order.bills,
      },
    });
    
    await newTransaction.save();

    let responseData;
    
    if (status === "completed") {
      await Order.findByIdAndDelete(id);
      responseData = {
        success: true, 
        message: "Order marked as completed and deleted from database", 
        data: order
      };
    } else {
      const updatedOrder = await Order.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      ).populate({
        path: "items.menuItem",
      });
      
      responseData = {
        success: true, 
        message: "Order updated", 
        data: updatedOrder
      };
    }

    res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const deletedOrder = await Order.findByIdAndDelete(id);
    if (!deletedOrder) return res.status(404).json({ message: "Order not found" });

    res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getOrdersByTable = async (req, res) => {
  try {
    const { tableNumber } = req.params;

    const orders = await Order.find({ tableNumber })
      .populate({
        path: "items.menuItem",
        populate: {
          path: "ingredients.ingredient",
        },
      })
      .sort({ orderDate: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    if (!["pending", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const orders = await Order.find({ status })
      .populate({
        path: "items.menuItem",
        populate: {
          path: "ingredients.ingredient",
        },
      })
      .sort({ orderDate: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  addOrder,
  getOrderById,
  getOrders,
  updateOrder,
  deleteOrder,
  getOrdersByTable,
  getOrdersByStatus,
};