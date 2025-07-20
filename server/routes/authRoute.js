import express from "express"
import { login, getUserData, verifyUser} from '../controller/adminController.js'
import isVeriiedUser from "../middlewares/tokenVerification.js";
import verifyToken from "../middlewares/tokenVerification.js";

const router = express.Router();

router.route("/login").post(login);

router.route("/").get(isVeriiedUser, getUserData)
router.route("/verify-user").post(verifyToken,verifyUser)


export default router; 