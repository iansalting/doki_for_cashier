import express from 'express';
import {
  addOrder,
  getOrders,
  updateOrder,
  getOrdersByTable,
  generateESCPOS,
  generateReceiptPDF,
  getOrderWithReceipt,
  getTransactionHistory
} from '../controller/orderController.js';
import verifyToken from '../middlewares/tokenVerification.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);


router.route('/dashboard')
  .get(
    authorizeRole("superadmin", "admin"),
    getOrders
  )
  .post(
    authorizeRole("superadmin", "admin"),
    addOrder
  );

// Update order (Admin or SuperAdmin)
router.route('/dashboard/:id').patch(
  authorizeRole("superadmin", "admin"),
  updateOrder
);

// Get orders by table (Admin or SuperAdmin)
router.route('/dashboard/table/:tableNumber').get(
  authorizeRole("superadmin", "admin"),
  getOrdersByTable
);

// Transaction history (Admin or SuperAdmin)
router.route('/transactions').get(
  authorizeRole("superadmin", "admin"),
  getTransactionHistory
);

// Receipt generation routes (Admin or SuperAdmin can generate receipts)
router.route('/:orderId/receipt-escpos').get(
  authorizeRole("superadmin", "admin"),
  generateESCPOS
);

router.route('/:orderId/receipt-pdf').get(
  authorizeRole("superadmin", "admin"),
  generateReceiptPDF
);

router.route('/:orderId/receipt-data').get(
  authorizeRole("superadmin", "admin"),
  getOrderWithReceipt
);

export default router;