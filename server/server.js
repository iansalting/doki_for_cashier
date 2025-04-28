import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import bodyParser from "body-parser";
const app = express();
import dbConnection  from './config/db.js'
import config from './config/config.js'  
import globalErrorHandler from "./middlewares/globalErrorHandler.js";
import authRoutes from "./routes/authRoute.js";
import orderRoute from './routes/orderRoutes.js'
import menuRoute from './routes/menuRoute.js'
import ingredientRoute from './routes/ingredientRoute.js'
import transaction from './routes/transactionHistory.js'
import salesRoute from './routes/salesRoute.js'
import authorizeRole from "./middlewares/roleMiddleware.js";
import verifyToken from "./middlewares/tokenVerification.js";
import delivery from "./routes/deliveryRoute.js"


// Middleware
app.use(cors());
app.use(express.json());
dotenv.config()
app.use(bodyParser.urlencoded({ extended: true })); 

// database connection 
dbConnection()

 
// user route
app.use("/api/auth", authRoutes);
app.use("/api/order",orderRoute)
app.use("/api/menu",menuRoute )
app.use("/api/ingredients",ingredientRoute )
app.use("/view/transaction", verifyToken ,authorizeRole('admin', 'superadmin'), transaction)
app.use('/view/superadmin/sales',salesRoute)
app.use("/api/delivery", delivery)

//error handler 
app.use(globalErrorHandler);


// Start server
const PORT = config.port;
app.listen(PORT, ()=> console.log (`server running ${PORT}`))

