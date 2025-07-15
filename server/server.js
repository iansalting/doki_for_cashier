import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import http from "http"; 
import { initSocket } from "./socket.js";

import dbConnection from "./config/db.js";
import config from "./config/config.js";
import globalErrorHandler from "./middlewares/globalErrorHandler.js";
import authRoutes from "./routes/authRoute.js";
import orderRoute from "./routes/orderRoutes.js";
import menuRoute from "./routes/menuRoute.js";
import ingredientRoute from "./routes/ingredientRoute.js";
import transaction from "./routes/transactionHistory.js";
import salesRoute from "./routes/salesRoute.js";
import authorizeRole from "./middlewares/roleMiddleware.js";
import verifyToken from "./middlewares/tokenVerification.js";
import delivery from "./routes/deliveryRoute.js";
import list from "./routes/menuListRoute.js";

dotenv.config();

const app = express();


app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
dbConnection();


app.use("/api/auth", authRoutes);
app.use("/api/order",  orderRoute);
app.use("/api/menulist", verifyToken,list);
app.use("/api/menu", verifyToken, authorizeRole("superadmin"), menuRoute);
app.use("/api/ingredients", verifyToken, authorizeRole("superadmin"), ingredientRoute);
app.use("/view/transaction", verifyToken, authorizeRole("superadmin"), transaction);
app.use("/view/superadmin/sales", verifyToken, authorizeRole("superadmin"), salesRoute);
app.use("/api/delivery", verifyToken,delivery);


app.use(globalErrorHandler);

// ✅ Create raw HTTP server
const server = http.createServer(app);


initSocket(server);


const PORT = config.port || 8000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
