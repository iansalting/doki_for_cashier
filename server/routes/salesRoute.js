import express from 'express'
const router = express.Router()
import { getTopSales, getDailySales, getMonthlySales } from '../controller/salesControler.js';


router.route('/').get(getTopSales)
router.route('/daily').get(getDailySales)
router.route('/monthly').get(getMonthlySales)


export default router;