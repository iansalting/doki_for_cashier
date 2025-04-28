import express from 'express';
import { addDelivery, getDeliveryByDate, getAllDelivery, deleteDelivery } from '../controller/deliveryController.js';

const router = express.Router();

router.post('/post', addDelivery);
router.get('/date', getDeliveryByDate);
router.get('/', getAllDelivery);
router.delete('/delete/:id', deleteDelivery);

export default router;