import createHttpError from "http-errors";
import Order from "../model/orderModel.js";
import Menu from "../model/menuModel.js";
import Ingredient from "../model/ingredientModel.js";
import mongoose from "mongoose";
import { getIO } from "../socket.js";
import PDFDocument from "pdfkit";

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

    // Calculate total price and required ingredients
    for (const item of items) {
      const menuItem = menuItems.find((m) => m._id.equals(item.menuItem));
      if (!menuItem) {
        return next(
          createHttpError(404, `Menu item ${item.menuItem} not found`)
        );
      }

      total += menuItem.price * item.quantity;

      // Calculate required ingredients for this item
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

    // Check if there's enough stock for all ingredients
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

    for (const ingredient of ingredients) {
      const requiredAmount = ingredientUpdate[ingredient._id];

      await Ingredient.findByIdAndUpdate(
        ingredient._id,
        { $inc: { quantity: -requiredAmount } },
        { new: true }
      );

      console.log(
        `Reduced ${ingredient.name} by ${requiredAmount}${ingredient.unit}`
      );
    }

    const populatedOrder = await Order.findById(newOrder._id).populate({
      path: "items.menuItem",
      populate: {
        path: "ingredients.ingredient",
      },
    });

    getIO().emit("new-order", newOrder);

    // Enhanced receipt details with more information
    const receiptDetails = {
      orderId: populatedOrder._id,
      tableNumber: populatedOrder.tableNumber,
      orderDate: populatedOrder.orderDate,
      status: populatedOrder.status,
      items: populatedOrder.items.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.menuItem.price,
        subtotal: item.menuItem.price * item.quantity,
      })),
      total: populatedOrder.bills.total,
      // Add store information (you can make this configurable)
      store: {
        name: "Your Restaurant Name",
        address: "123 Main Street, City, State 12345",
        phone: "(555) 123-4567",
        email: "info@yourrestaurant.com"
      }
    };

    res.status(201).json(receiptDetails);
  } catch (error) {
    next(error);
  }
};

// New function to generate PDF receipt
const generateReceiptPDF = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return next(createHttpError(400, "Invalid order ID"));
    }

    const order = await Order.findById(orderId).populate({
      path: "items.menuItem",
      populate: {
        path: "ingredients.ingredient",
      },
    });

    if (!order) {
      return next(createHttpError(404, "Order not found"));
    }

    // Create PDF with thermal receipt dimensions
    const doc = new PDFDocument({
      size: [226.77, 841.89], // 80mm width
      margin: 10
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${orderId}.pdf`);

    // Stream PDF to response
    doc.pipe(res);

    // Store info (make this configurable)
    const storeInfo = {
      name: "Your Restaurant Name",
      address: "123 Main Street, City, State 12345",
      phone: "(555) 123-4567",
      email: "info@yourrestaurant.com"
    };

    // Header
    doc.fontSize(14).text(storeInfo.name, { align: 'center' });
    doc.fontSize(10).text(storeInfo.address, { align: 'center' });
    doc.text(`Phone: ${storeInfo.phone}`, { align: 'center' });
    doc.text(`Email: ${storeInfo.email}`, { align: 'center' });
    doc.text('================================', { align: 'center' });
    doc.moveDown();

    // Order details
    doc.fontSize(12).text(`Order ID: ${order._id}`, { align: 'left' });
    doc.text(`Table: ${order.tableNumber}`, { align: 'left' });
    doc.text(`Date: ${order.orderDate.toLocaleDateString()}`, { align: 'left' });
    doc.text(`Time: ${order.orderDate.toLocaleTimeString()}`, { align: 'left' });
    doc.text(`Status: ${order.status.toUpperCase()}`, { align: 'left' });
    doc.text('--------------------------------', { align: 'center' });
    doc.moveDown();

    // Items
    doc.fontSize(10);
    order.items.forEach(item => {
      doc.text(`${item.menuItem.name}`, { continued: true });
      doc.text(`$${item.menuItem.price.toFixed(2)}`, { align: 'right' });
      doc.text(`Qty: ${item.quantity} x $${item.menuItem.price.toFixed(2)} = $${(item.quantity * item.menuItem.price).toFixed(2)}`, { align: 'left' });
      doc.moveDown(0.5);
    });

    // Total
    doc.text('--------------------------------', { align: 'center' });
    doc.fontSize(14).text(`TOTAL: $${order.bills.total.toFixed(2)}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text('Thank you for dining with us!', { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    next(error);
  }
};

// New function to generate ESC/POS commands
const generateESCPOS = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return next(createHttpError(400, "Invalid order ID"));
    }

    const order = await Order.findById(orderId).populate({
      path: "items.menuItem",
      populate: {
        path: "ingredients.ingredient",
      },
    });

    if (!order) {
      return next(createHttpError(404, "Order not found"));
    }

    // Store info
    const storeInfo = {
      name: "Your Restaurant Name",
      address: "123 Main Street, City, State 12345",
      phone: "(555) 123-4567"
    };

    const commands = [
      '\x1B\x40',  // Initialize printer
      '\x1B\x61\x01', // Center align
      '\x1B\x21\x10', // Double height
      `${storeInfo.name}\n`,
      '\x1B\x21\x00', // Normal size
      `${storeInfo.address}\n`,
      `Phone: ${storeInfo.phone}\n`,
      '================================\n',
      '\x1B\x61\x00', // Left align
      `Order ID: ${order._id}\n`,
      `Table: ${order.tableNumber}\n`,
      `Date: ${order.orderDate.toLocaleDateString()}\n`,
      `Time: ${order.orderDate.toLocaleTimeString()}\n`,
      `Status: ${order.status.toUpperCase()}\n`,
      '--------------------------------\n',
      ...order.items.map(item => 
        `${item.menuItem.name}\n` +
        `${item.quantity} x $${item.menuItem.price.toFixed(2)} = $${(item.quantity * item.menuItem.price).toFixed(2)}\n`
      ),
      '--------------------------------\n',
      '\x1B\x45\x01', // Bold
      '\x1B\x61\x01', // Center align
      `TOTAL: $${order.bills.total.toFixed(2)}\n`,
      '\x1B\x45\x00', // Normal
      '\x1B\x61\x00', // Left align
      '\n',
      '\x1B\x61\x01', // Center align
      'Thank you for dining with us!\n',
      '\x1B\x61\x00', // Left align
      '\n\n',
      '\x1D\x56\x41', // Cut paper
    ];

    res.json({ 
      success: true, 
      commands: commands.join(''),
      orderDetails: {
        orderId: order._id,
        tableNumber: order.tableNumber,
        total: order.bills.total,
        itemCount: order.items.length
      }
    });

  } catch (error) {
    next(error);
  }
};

const getOrderWithReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(createHttpError(400, "Invalid order ID"));
    }

    const order = await Order.findById(id).populate({
      path: "items.menuItem",
      populate: {
        path: "ingredients.ingredient",
      },
    });

    if (!order) {
      return next(createHttpError(404, "Order not found"));
    }


    const receiptData = {
      orderId: order._id,
      tableNumber: order.tableNumber,
      orderDate: order.orderDate,
      status: order.status,
      items: order.items.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.menuItem.price,
        subtotal: item.menuItem.price * item.quantity,
      })),
      total: order.bills.total,
      store: {
        name: "Your Restaurant Name",
        address: "123 Main Street, City, State 12345",
        phone: "(555) 123-4567",
        email: "info@yourrestaurant.com"
      }
    };

    res.status(200).json({ 
      success: true, 
      data: order,
      receiptData: receiptData
    });
  } catch (error) {
    next(error);
  }
};

// Keep your existing functions unchanged
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

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("items.menuItem");

    if (!updatedOrder) {
      return next(createHttpError(404, "Order not found"));
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to '${status}'`,
      data: updatedOrder,
    });
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
    if (!deletedOrder)
      return res.status(404).json({ message: "Order not found" });

    res
      .status(200)
      .json({ success: true, message: "Order deleted successfully" });
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

export {
  addOrder,
  getOrderById,
  getOrders,
  updateOrder,
  deleteOrder,
  getOrdersByTable,
  generateReceiptPDF,
  generateESCPOS,
  getOrderWithReceipt
};