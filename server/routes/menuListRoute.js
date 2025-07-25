import express from 'express';
import NodeCache from 'node-cache';
import { getAllMenu } from '../controller/menuController.js';
import verifyToken from '../middlewares/tokenVerification.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Create cache instance specifically for menu data
const menuCache = new NodeCache({
  stdTTL: 300, // 5 minutes cache
  checkperiod: 60, // Check for expired keys every minute
  useClones: false // Better performance by not cloning objects
});

// Cache middleware for menu responses
const cacheMenuResponse = (req, res, next) => {
  // Create cache key based on query parameters
  const cacheKey = `menu:${JSON.stringify(req.query || {})}`;
  const cachedData = menuCache.get(cacheKey);
  
  if (cachedData) {
    // Serve from cache
    res.set({
      'X-Cache': 'HIT',
      'Cache-Control': 'public, max-age=300', // Browser cache for 5 minutes
      'Content-Type': 'application/json'
    });
    return res.json(cachedData);
  }
  
  // Store original json method
  const originalJson = res.json;
  
  // Override res.json to cache successful responses
  res.json = function(data) {
    if (res.statusCode === 200 && data && data.success) {
      // Cache the successful response
      menuCache.set(cacheKey, data);
      console.log(`🔄 Cached menu data with key: ${cacheKey}`);
    }
    
    // Set cache miss header
    res.set('X-Cache', 'MISS');
    
    // Call original json method
    originalJson.call(this, data);
  };
  
  next();
};

// Cache clearing middleware
const clearMenuCache = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    menuCache.flushAll();
    console.log('🗑️ Menu cache cleared due to menu modification');
  }
  next();
};

// Apply authentication to all routes
router.use(verifyToken);

// Main menu routes (Admin or SuperAdmin can access)
router.route("/")
  .get(
    authorizeRole("superadmin", "admin"), // ✅ Fixed: individual parameters
    cacheMenuResponse,
    getAllMenu
  )
  .post(
    authorizeRole("superadmin", "admin"), // ✅ Fixed: individual parameters
    clearMenuCache,
    getAllMenu
  )
  .put(
    authorizeRole("superadmin", "admin"), // ✅ Fixed: individual parameters
    clearMenuCache,
    getAllMenu
  )
  .delete(
    authorizeRole("superadmin", "admin"), // ✅ Fixed: individual parameters
    clearMenuCache,
    getAllMenu
  );

// Cache stats endpoint (Admin or SuperAdmin can monitor)
router.get('/cache-stats',
  authorizeRole("superadmin", "admin"), // ✅ Fixed: individual parameters
  (req, res) => {
    const stats = menuCache.getStats();
    res.json({
      success: true,
      cacheStats: {
        keys: menuCache.keys().length,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hits / (stats.hits + stats.misses) || 0
      }
    });
  }
);

// Manual cache clear endpoint (Admin or SuperAdmin can clear cache)
router.post('/clear-cache',
  authorizeRole("superadmin", "admin"), // ✅ Fixed: individual parameters
  (req, res) => {
    menuCache.flushAll();
    res.json({
      success: true,
      message: 'Menu cache cleared successfully'
    });
  }
);
export { menuCache };
export default router;