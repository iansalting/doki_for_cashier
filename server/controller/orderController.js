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

    if (!tableNumber) {
      return next(createHttpError(400, "Table number is required"));
    }

    let subtotal = 0;
    const ingredientUpdate = {};

    const menuItems = await Menu.find({
      _id: { $in: items.map((item) => item.menuItem) },
    }).populate("sizes.ingredients.ingredient");

    const orderItems = [];

    for (const item of items) {
      const menuItem = menuItems.find((m) => m._id.equals(item.menuItem));
      if (!menuItem) {
        return next(createHttpError(404, `Menu item ${item.menuItem} not found`));
      }

      if (!menuItem.available) {
        return next(createHttpError(400, `Menu item "${menuItem.name}" is not available`));
      }

      // Resolve size or default to 'Classic'
      let selectedSize = null;
      let itemPrice = 0;

      if (Array.isArray(menuItem.sizes) && menuItem.sizes.length > 0) {
        selectedSize = item.selectedSize
          ? menuItem.sizes.find((s) => s.label === item.selectedSize)
          : menuItem.sizes.find((s) => s.label === "Classic");

        if (!selectedSize) {
          return next(createHttpError(400, `Size "${item.selectedSize || "Classic"}" not available for ${menuItem.name}`));
        }

        itemPrice = selectedSize.price;
      } else {
        // Fallback for items without sizes (shouldn't happen with your system)
        itemPrice = menuItem.basePrice || menuItem.price || 0;
      }

      if (itemPrice <= 0) {
        return next(createHttpError(400, `Invalid price for ${menuItem.name}`));
      }

      const usedIngredients = selectedSize?.ingredients || menuItem.ingredients || [];

      // Check ingredient availability
      for (const ingredient of usedIngredients) {
        const ingredientData = ingredient.ingredient;
        if (!ingredientData) continue;

        const requiredAmount = ingredient.quantity * item.quantity;
        const available = ingredientData.stockQuantity !== undefined 
          ? ingredientData.stockQuantity 
          : ingredientData.quantity || 0;

        if (available < requiredAmount) {
          return next(createHttpError(400, 
            `Insufficient "${ingredientData.name}" for ${item.quantity}x ${menuItem.name}. Required: ${requiredAmount}, Available: ${available}`
          ));
        }

        const ingredientId = ingredientData._id.toString();
        ingredientUpdate[ingredientId] = (ingredientUpdate[ingredientId] || 0) + requiredAmount;
      }

      subtotal += itemPrice * item.quantity;

      orderItems.push({
        menuItem: item.menuItem,
        selectedSize: selectedSize?.label || "Classic",
        quantity: item.quantity,
        price: itemPrice * item.quantity, // Total price for this item
      });
    }

    // Calculate tax and total
    const taxRate = 0.08; // 8% tax
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
    const totalWithTax = parseFloat((subtotal + taxAmount).toFixed(2));

    const newOrder = new Order({
      tableNumber,
      status: "pending",
      orderDate: new Date(),
      bills: { 
        total: subtotal,
        tax: taxAmount,
        totalWithTax: totalWithTax
      },
      payment: "cash",
      items: orderItems,
    });

    await newOrder.save();

    // Update ingredient stock atomically
    const ingredientUpdatePromises = Object.entries(ingredientUpdate).map(
      async ([ingredientId, requiredAmount]) => {
        try {
          const updatedIngredient = await Ingredient.findOneAndUpdate(
            { 
              _id: ingredientId,
              $or: [
                { stockQuantity: { $gte: requiredAmount } },
                { quantity: { $gte: requiredAmount } }
              ]
            },
            [
              {
                $set: {
                  stockQuantity: {
                    $cond: {
                      if: { $ne: ["$stockQuantity", null] },
                      then: { $subtract: ["$stockQuantity", requiredAmount] },
                      else: "$stockQuantity"
                    }
                  },
                  quantity: {
                    $cond: {
                      if: { $eq: ["$stockQuantity", null] },
                      then: { $subtract: ["$quantity", requiredAmount] },
                      else: "$quantity"
                    }
                  }
                }
              }
            ],
            { new: true }
          );

          if (!updatedIngredient) {
            throw new Error(`Failed to update ingredient - insufficient stock during update`);
          }

          return updatedIngredient;
        } catch (err) {
          console.error(`Failed to update ingredient ${ingredientId}:`, err);
          throw new Error(`Failed to update ingredient stock`);
        }
      }
    );

    await Promise.all(ingredientUpdatePromises);

    const populatedOrder = await Order.findById(newOrder._id).populate({
      path: "items.menuItem",
      select: "name description category"
    });

    // Emit socket event
    getIO().emit("new-order", {
      orderId: newOrder._id,
      tableNumber: newOrder.tableNumber,
      status: newOrder.status,
      total: totalWithTax,
      itemCount: orderItems.length,
      timestamp: new Date()
    });

    // Create receipt data
    const receiptDetails = {
      orderId: populatedOrder._id,
      orderNumber: populatedOrder._id.toString().slice(-8).toUpperCase(),
      tableNumber: populatedOrder.tableNumber,
      orderDate: populatedOrder.orderDate,
      status: populatedOrder.status,
      items: populatedOrder.items.map(item => {
        return {
          name: item.menuItem.name,
          size: item.selectedSize,
          quantity: item.quantity,
          unitPrice: item.price / item.quantity,
          subtotal: item.price,
        };
      }),
      bills: {
        subtotal: subtotal,
        tax: taxAmount,
        totalWithTax: totalWithTax,
        taxRate: (taxRate * 100).toFixed(0) + '%'
      },
      payment: "Cash",
      store: {
        name: "DOKI DOKI Ramen House",
        address: "381 SBM. Eliserio G. Tagle, Sampaloc 3, Dasmariñas, 4114 Cavite",
        phone: "+63 912 345 6789",
        email: "info@dokidokiramen.ph",
        tin: "123-456-789-000",
        businessPermit: "BP-2024-001234"
      },
    };

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: receiptDetails
    });
  } catch (error) {
    console.error("Error in addOrder:", error);
    next(error);
  }
};

const generateReceiptPDF = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return next(createHttpError(400, "Invalid order ID"));
    }

    const order = await Order.findById(orderId).populate({
      path: "items.menuItem",
      select: "name description category"
    });

    if (!order) {
      return next(createHttpError(404, "Order not found"));
    }

    // Create PDF with thermal receipt dimensions (80mm width)
    const doc = new PDFDocument({
      size: [226.77, 841.89], // 80mm width x ~297mm length
      margin: 10,
    });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${order._id.toString().slice(-8)}.pdf`
    );

    // Stream PDF to response
    doc.pipe(res);

    // Store info
    const storeInfo = {
      name: "DOKI DOKI Ramen House",
      address: "381 SBM. Eliserio G. Tagle, Sampaloc 3, Dasmariñas, 4114 Cavite",
      phone: "+63 912 345 6789",
      email: "info@dokidokiramen.ph",
      tin: "TIN: 123-456-789-000",
      businessPermit: "BP: 2024-001234"
    };

    // Header
    doc.fontSize(16).text(storeInfo.name, { align: "center" });
    doc.fontSize(9).text(storeInfo.address, { align: "center" });
    doc.text(`Phone: ${storeInfo.phone}`, { align: "center" });
    doc.text(storeInfo.tin, { align: "center" });
    doc.text(storeInfo.businessPermit, { align: "center" });
    doc.text("===================================", { align: "center" });
    doc.moveDown();

    // Order details
    doc.fontSize(11).text(`Order #: ${order._id.toString().slice(-8).toUpperCase()}`, { align: "left" });
    doc.text(`Table: ${order.tableNumber}`, { align: "left" });
    doc.text(`Date: ${order.orderDate.toLocaleDateString('en-PH')}`, { align: "left" });
    doc.text(`Time: ${order.orderDate.toLocaleTimeString('en-PH')}`, { align: "left" });
    doc.text(`Status: ${order.status.toUpperCase()}`, { align: "left" });
    doc.text(`Payment: CASH`, { align: "left" });
    doc.text("-----------------------------------", { align: "center" });
    doc.moveDown();

    // Items header
    doc.fontSize(9);
    doc.text("ITEM", 10, doc.y, { continued: true, width: 100 });
    doc.text("QTY", 110, doc.y, { continued: true, width: 30 });
    doc.text("PRICE", 140, doc.y, { continued: true, width: 40 });
    doc.text("TOTAL", 180, doc.y, { width: 40, align: "right" });
    doc.text("-----------------------------------", { align: "center" });

    // Items
    order.items.forEach((item) => {
      const unitPrice = item.price / item.quantity;
      
      // Item name and size
      const itemText = item.selectedSize && item.selectedSize !== 'Classic' 
        ? `${item.menuItem.name} (${item.selectedSize})`
        : item.menuItem.name;
      
      doc.text(itemText, 10, doc.y, { continued: true, width: 100 });
      doc.text(`${item.quantity}`, 110, doc.y, { continued: true, width: 30 });
      doc.text(`₱${unitPrice.toFixed(2)}`, 140, doc.y, { continued: true, width: 40 });
      doc.text(`₱${item.price.toFixed(2)}`, 180, doc.y, { width: 40, align: "right" });
      doc.moveDown(0.3);
    });

    // Totals
    doc.text("-----------------------------------", { align: "center" });
    doc.moveDown(0.3);
    
    // Subtotal
    doc.text("Subtotal:", 120, doc.y, { continued: true, width: 60 });
    doc.text(`₱${order.bills.total.toFixed(2)}`, 180, doc.y, { width: 40, align: "right" });
    
    // Tax
    doc.text("Tax (8%):", 120, doc.y, { continued: true, width: 60 });
    doc.text(`₱${order.bills.tax.toFixed(2)}`, 180, doc.y, { width: 40, align: "right" });
    
    doc.text("===================================", { align: "center" });
    
    // Total
    doc.fontSize(12).text("TOTAL:", 120, doc.y, { continued: true, width: 60 });
    doc.text(`₱${order.bills.totalWithTax.toFixed(2)}`, 180, doc.y, { width: 40, align: "right" });
    
    doc.moveDown();
    doc.fontSize(9);
    doc.text("===================================", { align: "center" });
    doc.moveDown();

    // Footer
    doc.text("Thank you for dining with us!", { align: "center" });
    doc.text("Please come again!", { align: "center" });
    doc.moveDown();
    doc.text(`Cashier: System`, { align: "center" });
    doc.text(`${new Date().toLocaleString('en-PH')}`, { align: "center" });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    next(error);
  }
};

const generateESCPOS = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return next(createHttpError(400, "Invalid order ID"));
    }

    const order = await Order.findById(orderId).populate({
      path: "items.menuItem",
      select: "name description category"
    });

    if (!order) {
      return next(createHttpError(404, "Order not found"));
    }

    // Store info
    const storeInfo = {
      name: "DOKI DOKI Ramen House",
      address: "381 SBM. Eliserio G. Tagle, Sampaloc 3, Dasmariñas, 4114 Cavite",
      phone: "+63 912 345 6789",
      tin: "TIN: 123-456-789-000"
    };

    const commands = [
      "\x1B\x40", // Initialize printer
      "\x1B\x61\x01", // Center align
      "\x1B\x21\x10", // Double height
      `${storeInfo.name}\n`,
      "\x1B\x21\x00", // Normal size
      `${storeInfo.address}\n`,
      `Phone: ${storeInfo.phone}\n`,
      `${storeInfo.tin}\n`,
      "==================================\n",
      "\x1B\x61\x00", // Left align
      `Order #: ${order._id.toString().slice(-8).toUpperCase()}\n`,
      `Table: ${order.tableNumber}\n`,
      `Date: ${order.orderDate.toLocaleDateString('en-PH')}\n`,
      `Time: ${order.orderDate.toLocaleTimeString('en-PH')}\n`,
      `Status: ${order.status.toUpperCase()}\n`,
      `Payment: CASH\n`,
      "----------------------------------\n",
      ...order.items.map((item) => {
        const unitPrice = item.price / item.quantity;
        const itemText = item.selectedSize && item.selectedSize !== 'Classic' 
          ? `${item.menuItem.name} (${item.selectedSize})`
          : item.menuItem.name;
        
        return `${itemText}\n` +
               `${item.quantity} x ₱${unitPrice.toFixed(2)} = ₱${item.price.toFixed(2)}\n`;
      }),
      "----------------------------------\n",
      `Subtotal: ₱${order.bills.total.toFixed(2)}\n`,
      `Tax (8%): ₱${order.bills.tax.toFixed(2)}\n`,
      "==================================\n",
      "\x1B\x45\x01", // Bold
      "\x1B\x61\x01", // Center align
      `TOTAL: ₱${order.bills.totalWithTax.toFixed(2)}\n`,
      "\x1B\x45\x00", // Normal
      "\x1B\x61\x00", // Left align
      "\n",
      "\x1B\x61\x01", // Center align
      "Thank you for dining with us!\n",
      "Please come again!\n",
      "\x1B\x61\x00", // Left align
      "\n\n",
      "\x1D\x56\x41", // Cut paper
    ];

    res.json({
      success: true,
      commands: commands.join(""),
      orderDetails: {
        orderId: order._id,
        orderNumber: order._id.toString().slice(-8).toUpperCase(),
        tableNumber: order.tableNumber,
        total: order.bills.totalWithTax,
        itemCount: order.items.length,
      },
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
      select: "name description category"
    });

    if (!order) {
      return next(createHttpError(404, "Order not found"));
    }

    const receiptData = {
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8).toUpperCase(),
      tableNumber: order.tableNumber,
      orderDate: order.orderDate,
      status: order.status,
      items: order.items.map((item) => ({
        name: item.menuItem.name,
        size: item.selectedSize,
        quantity: item.quantity,
        unitPrice: item.price / item.quantity,
        subtotal: item.price,
      })),
      bills: order.bills,
      payment: "Cash",
      store: {
        name: "DOKI DOKI Ramen House",
        address: "381 SBM. Eliserio G. Tagle, Sampaloc 3, Dasmariñas, 4114 Cavite",
        phone: "+63 912 345 6789",
        email: "info@dokidokiramen.ph",
        tin: "123-456-789-000",
        businessPermit: "BP-2024-001234"
      },
    };

    res.status(200).json({
      success: true,
      data: order,
      receiptData: receiptData,
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: "items.menuItem",
      select: "name description category"
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
        select: "name description category"
      })
      .sort({ orderDate: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error in getOrders:", error);
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

    if (!status || !["pending", "completed"].includes(status)) {
      return res.status(400).json({ message: "Valid status is required (pending or completed)" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("items.menuItem");

    if (!updatedOrder) {
      return next(createHttpError(404, "Order not found"));
    }

    // Emit socket event for status update
    getIO().emit("order-updated", {
      orderId: updatedOrder._id,
      status: updatedOrder.status,
      tableNumber: updatedOrder.tableNumber,
      timestamp: new Date()
    });

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
        select: "name description category"
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
  getOrderWithReceipt,
};