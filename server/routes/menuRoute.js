import express from 'express'
const router = express.Router()
import {addMenu, updateMenu, getAllMenu, getMenuById} from '../controller/menuController.js'
import verifyToken from '../middlewares/tokenVerification.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';


router.use(verifyToken);

// GET routes - Both admin and superadmin can view
router.route("/").get(
  authorizeRole("superadmin", "admin"),
  getAllMenu
);

router.route("/:id").get(
  authorizeRole("superadmin", "admin"),
  getMenuById
);

// POST/PATCH routes - Only superadmin can modify
router.route("/post").post(
  authorizeRole("superadmin"),
  addMenu
);

router.route("/update/:id").patch(
  authorizeRole("superadmin"),
  updateMenu
);


export default router;