import express from 'express'
import { addOrder, getOrderById , getOrders, updateOrder, deleteOrder, getOrdersByStatus, getOrdersByTable } from '../controller/orderController.js'

const router = express.Router()

router.route('/dashboard').get(getOrders)
router.route('/dashboard:id').get(getOrderById)
router.route('/dashboard:tableumber').get(getOrdersByStatus)
router.route('/dashboard:status').get(getOrdersByTable)
router.route('/dashboard').post(addOrder)
router.route('/dashboard/:id').patch(updateOrder)
router.route('/dashboard:id').get(deleteOrder)


export default router;
