import express from 'express'
import {
  addOrder,
  getOrderById,
  getOrders,
  updateOrder,
  deleteOrder,
  getOrdersByTable,
  generateESCPOS,
  generateReceiptPDF,
  getOrderWithReceipt
} from '../controller/orderController.js'

const router = express.Router()

// Routes for main dashboard
router.route('/dashboard').get(getOrders)           // GET all orders
router.route('/dashboard').post(addOrder)           // POST new order
router.route('/dashboard/:id').get(getOrderById)    // GET order by ID
router.route('/dashboard/:id').patch(updateOrder)   // PATCH (update) order
router.route('/dashboard/:id').delete(deleteOrder)  // DELETE order

router.route('/dashboard/table/:tableNumber').get(getOrdersByTable)

// Routes for receipt generation
router.route('/:orderId/receipt-escpos').get(generateESCPOS)
router.route('/:orderId/receipt-pdf').get(generateReceiptPDF)
router.route('/:orderId/receipt-data').get(getOrderWithReceipt)

export default router
