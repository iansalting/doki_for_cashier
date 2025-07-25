import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import http from "http";
import path from "path";
import fs from "fs";
import compression from "compression";
import NodeCache from "node-cache";

import { initSocket } from "./socket.js";
import dbConnection from "./config/db.js";
import config from "./config/config.js";
import globalErrorHandler from "./middlewares/globalErrorHandler.js";

// Routes
import authRoutes from "./routes/authRoute.js";
import orderRoute from "./routes/orderRoutes.js";
import menuRoute from "./routes/menuRoute.js";
import ingredientRoute from "./routes/ingredientRoute.js";
import transaction from "./routes/transactionHistory.js";
import salesRoute from "./routes/salesRoute.js";
import delivery from "./routes/deliveryRoute.js";
import list from "./routes/menuListRoute.js";

// Cache System
import UnifiedMenuCache from "./scripts/unifiedMenuCache.js";

dotenv.config();

const app = express();

// Cache Instances
const menuCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60,
});

const staticCache = new NodeCache({
  stdTTL: 86400, // 24 hours
  checkperiod: 3600,
});

const unifiedCache = new UnifiedMenuCache();

// Middleware Setup
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Image Serving Middleware
const createUnifiedImageMiddleware = (uploadDirs = ["./uploads/menu"]) => {
  return async (req, res, next) => {
    try {
      const filename = req.params.filename || path.basename(req.path);
      let imagePath = null;
      
      // Find image in upload directories
      for (const dir of uploadDirs) {
        const possiblePath = path.join(dir, filename);
        if (fs.existsSync(possiblePath)) {
          imagePath = possiblePath;
          break;
        }
      }
      
      if (!imagePath) {
        return res.status(404).json({ error: 'Image not found' });
      }

      console.log(`🖼️  Serving image: ${filename}`);

      // Get cached image from unified cache
      const imageData = await unifiedCache.getImage(imagePath);
      
      // Set comprehensive cache headers
      res.set({
        'Content-Type': imageData.contentType,
        'Content-Length': imageData.size,
        'ETag': imageData.etag,
        'Last-Modified': imageData.mtime.toUTCString(),
        'Cache-Control': 'public, max-age=604800, immutable', // 7 days
        'X-Cache-Status': 'UNIFIED-HIT',
        'X-Image-Size': `${imageData.sizeMB.toFixed(2)}MB`,
        'X-Content-Type-Options': 'nosniff',
        'Connection': 'keep-alive'
      });

      // Check client cache
      const clientETag = req.headers['if-none-match'];
      const clientModified = req.headers['if-modified-since'];
      
      if (clientETag === imageData.etag || 
          (clientModified && new Date(clientModified) >= imageData.mtime)) {
        return res.status(304).end();
      }

      res.send(imageData.buffer);
      
    } catch (error) {
      console.error('❌ Unified image serving error:', error);
      next();
    }
  };
};

// Static File Serving
app.get('/uploads/menu/:filename', createUnifiedImageMiddleware(['./uploads/menu']));

app.use(
  "/uploads",
  express.static("uploads", {
    maxAge: "1y",
    etag: true,
    lastModified: true,
    immutable: true,
    setHeaders: (res, path) => {
      if (
        path.endsWith(".jpg") ||
        path.endsWith(".jpeg") ||
        path.endsWith(".png") ||
        path.endsWith(".webp")
      ) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Cache-Status", "STATIC-FALLBACK");
      }
    },
  })
);

app.use(
  "/menu-images",
  express.static(path.join(process.cwd(), "downloaded-menu-images"), {
    maxAge: "7d",
    etag: true,
    immutable: true,
    setHeaders: (res, path, stat) => {
      res.set({
        "Cache-Control": "public, max-age=604800, immutable",
        "Connection": "keep-alive",
        "X-Cache-Status": "STATIC-ORIGINAL"
      });
    },
  })
);

// Cache Middleware
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Skip caching for authenticated routes that shouldn't be cached
    if (req.path.includes("/auth") || req.path.includes("/order")) {
      return next();
    }

    const key = `${req.method}:${req.originalUrl}`;
    const cached = menuCache.get(key);

    if (cached) {
      res.set({
        "X-Cache": "NODECACHE-HIT",
        "Cache-Control": `public, max-age=${duration}`,
        "Content-Type": "application/json",
      });
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json;
    res.json = function (data) {
      if (res.statusCode === 200 && data) {
        menuCache.set(key, data, duration);
      }
      res.set("X-Cache", "NODECACHE-MISS");
      originalJson.call(this, data);
    };

    next();
  };
};

// Unified Cache Middleware
const unifiedCacheMiddleware = (cacheType = 'menu') => {
  return async (req, res, next) => {
    try {
      // Skip for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const { category } = req.params;
      const { detailed } = req.query;

      // Determine cache strategy based on request
      let menuItems;
      let cacheSource = 'UNIFIED';

      if (category) {
        menuItems = await unifiedCache.getMenuByCategory(category);
        cacheSource += '-CATEGORY';
      } else if (detailed === 'true') {
        menuItems = await unifiedCache.getMenuWithIngredients();
        cacheSource += '-DETAILED';
      } else {
        menuItems = await unifiedCache.getAvailableMenu();
        cacheSource += '-ALL';
      }

      // Set response headers
      res.set({
        'X-Cache-Source': cacheSource,
        'X-Total-Items': menuItems.length,
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'Content-Type': 'application/json'
      });

      res.json({
        success: true,
        data: menuItems,
        total: menuItems.length,
        cached: true
      });

    } catch (error) {
      console.error('❌ Unified cache middleware error:', error);
      next();
    }
  };
};

// Cache Invalidation Middleware
const cacheInvalidationMiddleware = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Check if this was a successful modification to menu data
    if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') 
        && req.path.includes('/menu') 
        && res.statusCode < 400) {
      
      console.log('🔄 Menu data modified, invalidating caches...');
      
      // Clear unified cache
      unifiedCache.invalidateMenuCache();
      
      // Clear NodeCache menu items
      const menuKeys = menuCache.keys().filter(key => key.includes('menu'));
      menuKeys.forEach(key => menuCache.del(key));
      
      console.log(`✅ Invalidated ${menuKeys.length} NodeCache keys and unified menu cache`);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Performance Optimization Middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    setImmediate(next);
  } else if (
    req.path.startsWith("/uploads/") ||
    req.path.startsWith("/menu-images/")
  ) {
    setTimeout(next, 0);
  } else {
    next();
  }
});

// Database Connection
dbConnection();

// Cached Menu Endpoints (before main routes)
app.get('/api/menulist/cached', unifiedCacheMiddleware('menu'));
app.get('/api/menulist/category/:category', unifiedCacheMiddleware('category'));
app.get('/api/menulist/detailed', unifiedCacheMiddleware('detailed'));

// Cache Management Endpoints
app.get('/api/admin/cache/stats', (req, res) => {
  const unifiedStats = unifiedCache.getStats();
  const nodeStats = {
    keys: menuCache.keys().length,
    stats: menuCache.getStats()
  };
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    unified: unifiedStats,
    nodeCache: nodeStats
  });
});

app.post('/api/admin/cache/clear', async (req, res) => {
  const { type, target } = req.body;
  
  try {
    let result = { cleared: [] };
    
    if (type === 'all' || type === 'unified') {
      unifiedCache.clearAll();
      result.cleared.push('unified-cache');
    }
    
    if (type === 'all' || type === 'node') {
      menuCache.flushAll();
      result.cleared.push('node-cache');
    }
    
    if (type === 'menu') {
      unifiedCache.invalidateMenuCache();
      result.cleared.push('menu-data');
    }
    
    if (type === 'image' && target) {
      const cleared = unifiedCache.clearImage(`./uploads/menu/${target}`);
      result.cleared.push(cleared ? `image-${target}` : 'image-not-found');
    }
    
    res.json({
      success: true,
      message: `Cleared: ${result.cleared.join(', ')}`,
      result
    });
    
  } catch (error) {
    console.error('❌ Cache clear error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

app.post('/api/admin/cache/preload', async (req, res) => {
  try {
    console.log('🚀 Manual cache preload requested...');
    await unifiedCache.preloadPopularItems();
    res.json({ 
      success: true, 
      message: 'Cache preloaded successfully',
      stats: unifiedCache.getStats()
    });
  } catch (error) {
    console.error('❌ Preload error:', error);
    res.status(500).json({ error: 'Failed to preload cache' });
  }
});

// Main Routes (Auth/Role middleware moved to individual route files)
app.use("/api/auth", authRoutes);
app.use("/api/order", orderRoute);
app.use("/api/menulist", list);
app.use("/api/menu", cacheInvalidationMiddleware, menuRoute);
app.use("/api/ingredients", ingredientRoute);
app.use("/view/transaction", transaction);
app.use("/view/superadmin/sales", salesRoute);
app.use("/api/delivery", delivery);

// Global Error Handler
app.use(globalErrorHandler);

// Server Setup
const server = http.createServer(app);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

initSocket(server);

const PORT = config.port || 8000;

// Server Startup with Cache Preloading
const startServer = async () => {
  try {
    console.log('🚀 Starting server with unified caching system...');
    
    // Preload unified cache
    console.log('📦 Preloading menu and image cache...');
    await unifiedCache.preloadPopularItems();
    
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📷 Enhanced images: http://localhost:${PORT}/uploads/menu/`);
      console.log(`🚀 Dual caching system active:`);
      console.log(`   • NodeCache: API responses (5min)`);
      console.log(`   • UnifiedCache: Menu data + Images (5min + LRU)`);
      console.log(`📊 Cache stats: http://localhost:${PORT}/api/admin/cache/stats`);
      console.log(`🛠️  Cache admin: http://localhost:${PORT}/api/admin/cache/clear`);
      
      // Cache Performance Monitoring
      setInterval(() => {
        const unifiedStats = unifiedCache.getStats();
        const nodeKeys = menuCache.keys().length;
        
        console.log(`📊 Cache Performance Report:`);
        console.log(`   NodeCache: ${nodeKeys} keys active`);
        console.log(`   Images: ${unifiedStats.images.hitRate} hit rate, ${unifiedStats.images.memoryUsage}`);
        console.log(`   Menu: ${unifiedStats.menu.hitRate} hit rate, ${unifiedStats.menu.cacheSize} items`);
        
        if (unifiedStats.popular.length > 0) {
          console.log(`   Popular: ${unifiedStats.popular[0].image} (${unifiedStats.popular[0].requests} requests)`);
        }
      }, 10 * 60 * 1000); // Every 10 minutes
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

// Graceful Shutdown
process.on("SIGINT", () => {
  console.log("🔄 Graceful shutdown initiated...");
  
  // Log final statistics
  const finalStats = unifiedCache.getStats();
  console.log("📊 Final Cache Statistics:");
  console.log(`   Image Cache: ${finalStats.images.hitRate} hit rate`);
  console.log(`   Menu Cache: ${finalStats.menu.hitRate} hit rate`);
  console.log(`   NodeCache Keys: ${menuCache.keys().length}`);
  
  // Clear all caches
  console.log("🧹 Clearing all caches...");
  menuCache.flushAll();
  staticCache.flushAll();
  unifiedCache.clearAll();
  
  console.log("✅ Shutdown complete");
  process.exit(0);
});

// Start the server
startServer();

// Export cache instances for use in other modules
export { unifiedCache, menuCache };