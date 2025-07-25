import express from 'express';
import { 
  addDelivery, 
  getDeliveryByDate, 
  getAllDelivery, 
  deleteDelivery 
} from '../controller/deliveryController.js';
import verifyToken from '../middlewares/tokenVerification.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();


router.post('/post', 
  verifyToken, 
  authorizeRole("superadmin", "admin"), 
  addDelivery
);


router.get('/date', 
  verifyToken, 
  authorizeRole("superadmin", "admin"), 
  getDeliveryByDate
);

router.get('/', 
  verifyToken, 
  authorizeRole("superadmin", "admin"), 
  getAllDelivery
);

router.delete('/delete/:id', 
  verifyToken, 
  authorizeRole("superadmin"), 
  deleteDelivery
);

export default router;