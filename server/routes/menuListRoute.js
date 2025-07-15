import express from 'express'
const router = express.Router()
import {getAllMenu} from '../controller/menuController.js'


router.route("/").get( getAllMenu )

export default router;