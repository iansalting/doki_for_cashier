import express from 'express'
const router = express.Router()
import { getAllCompletedTransactions, getAllCancelledOrder, getAllTransactionByDate} from '../controller/transactionController.js'

router.route('/cancelled').get(getAllCancelledOrder)
router.route('/date').get(getAllTransactionByDate)
router.route('/completed').get(getAllCompletedTransactions)



export default router