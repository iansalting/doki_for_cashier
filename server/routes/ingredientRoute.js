import express from 'express';
const router = express.Router();
import {getAllIngredient, getIngredientById, addIngredient, deleteIngredient, updateIngredient} from '../controller/ingredientController.js'

router.route("/post").post(addIngredient)
router.route("/delete/:id").delete(deleteIngredient)
router.route("/update/:id").patch(updateIngredient)
router.route("/").get(getAllIngredient)
router.route("/:id").get(getIngredientById)


export default router;