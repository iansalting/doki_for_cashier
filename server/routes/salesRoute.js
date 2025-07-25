import express from 'express';
import { 
  getTopSales, 
  getDailySales, 
  getMonthlySales 
} from '../controller/salesControler.js';
import verifyToken from '../middlewares/tokenVerification.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Apply authentication and SuperAdmin role to all routes
router.use(verifyToken);
router.use(authorizeRole("superadmin"));

// GET - Top sales data (SuperAdmin only)
router.route('/').get(getTopSales);

// GET - Daily sales report (SuperAdmin only)
router.route('/daily').get(getDailySales);

// GET - Monthly sales report (SuperAdmin only)
router.route('/monthly').get(getMonthlySales);

export default router;