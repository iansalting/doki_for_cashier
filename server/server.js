import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import path from 'path';
import compression from 'compression';
import { fileURLToPath } from 'url'; // Add this import
import { initSocket } from './socket.js';
import dbConnection from './config/db.js';
import config from './config/config.js';
import globalErrorHandler from './middlewares/globalErrorHandler.js';

// Routes
import authRoutes from './routes/authRoute.js';
import orderRoute from './routes/orderRoutes.js';
import menuRoute from './routes/menuRoute.js';
import ingredientRoute from './routes/ingredientRoute.js';
import transaction from './routes/transactionHistory.js';
import salesRoute from './routes/salesRoute.js';
import delivery from './routes/deliveryRoute.js';
import list from './routes/menuListRoute.js';
import imageRoutes from './routes/imageRoutes.js';

dotenv.config();

const app = express();

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware Setup
app.use(compression({ level: 6, threshold: 1024 }));
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const getUploadsRoot = () => {
  if (config.sharedPath) {
    return path.dirname(config.sharedPath);
  }
  // Fallback
  return path.join(process.cwd(), 'uploads');
};

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS headers for static files
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Database Connection
dbConnection();

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/order', orderRoute);
app.use('/api/menulist', list);
app.use('/api/menu', menuRoute);
app.use('/api/ingredients', ingredientRoute);
app.use('/view/transaction', transaction);
app.use('/view/superadmin/sales', salesRoute);
app.use('/api/delivery', delivery);
app.use('/api', imageRoutes);
app.use('/uploads/menu', express.static(path.join(__dirname, 'uploads/menu')));
// Global Error Handler
app.use(globalErrorHandler);

// Server Setup
const server = http.createServer(app);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

initSocket(server);

const PORT = config.port || 8000;

// Start the server
const startServer = async () => {
  try {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Static files served from: ${path.join(__dirname, 'uploads')}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('Graceful shutdown initiated...');
  console.log('Shutdown complete');
  process.exit(0);
});

startServer();