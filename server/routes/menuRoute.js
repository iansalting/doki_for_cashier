import express from 'express'
const router = express.Router()
import {addMenu, updateMenu, getAllMenu, getMenuById} from '../controller/menuController.js'


router.route("/post").post( addMenu )
router.route("/update/:id").patch( updateMenu )
router.route("/").get( getAllMenu )
router.route("/:id").get( getMenuById )



export default router;