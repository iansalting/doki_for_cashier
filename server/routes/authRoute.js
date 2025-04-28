import express from "express"
import {register, login, getUserData} from '../controller/adminController.js'
import isVeriiedUser from "../middlewares/tokenVerification.js";

const router = express.Router();

//Auth Routes 
router.route("/register").post(register);
router.route("/login").post(login);

router.route("/").get(isVeriiedUser, getUserData)


export default router; 