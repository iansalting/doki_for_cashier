// unifiedMenuCache.js - Complete caching system for menu data + images
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import MenuItem from '../model/menuModel.js';

class UnifiedMenuCache {
  constructor() {
    // Image cache
    this.imageCache = new Map();
    this.maxImageCacheSize = 100;
    this.maxImageMemoryMB = 50;
    this.currentImageMemoryMB = 0;

    // Menu data cache
    this.menuCache = new Map();
    this.menuCacheExpiry = 5 * 60 * 1000; // 5 minutes for menu data

    // Statistics
    this.stats = {
      images: { hits: 0, misses: 0, evictions: 0 },
      menu: { hits: 0, misses: 0, refreshes: 0 },
      totalRequests: 0
    };

    // Popular items tracking
    this.accessCount = new Map();
    this.preloadThreshold = 3;

    console.log('🚀 Unified Menu & Image Cache initialized');
  }

  // ==================== IMAGE CACHING ====================

  generateImageCacheKey(imagePath) {
    return crypto.createHash('md5').update(imagePath).digest('hex');
  }

  async getImage(imagePath) {
    this.stats.totalRequests++;
    const cacheKey = this.generateImageCacheKey(imagePath);
    
    // Track access frequency
    this.trackImageAccess(imagePath);
    
    // Check cache
    if (this.imageCache.has(cacheKey)) {
      this.stats.images.hits++;
      console.log(`🎯 Image Cache HIT: ${path.basename(imagePath)}`);
      
      const cachedData = this.imageCache.get(cacheKey);
      // Move to end (LRU)
      this.imageCache.delete(cacheKey);
      this.imageCache.set(cacheKey, cachedData);
      
      return cachedData;
    }

    // Cache miss - load from disk
    return await this.loadAndCacheImage(imagePath, cacheKey);
  }

  async loadAndCacheImage(imagePath, cacheKey) {
    this.stats.images.misses++;
    console.log(`📁 Image Cache MISS: ${path.basename(imagePath)}`);
    
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
      }

      const stats = fs.statSync(imagePath);
      const imageBuffer = fs.readFileSync(imagePath);
      const imageSizeMB = imageBuffer.length / (1024 * 1024);
      
      const imageData = {
        buffer: imageBuffer,
        mtime: stats.mtime,
        size: stats.size,
        sizeMB: imageSizeMB,
        etag: crypto.createHash('md5').update(imageBuffer).digest('hex'),
        contentType: this.getContentType(imagePath),
        lastAccessed: new Date()
      };

      await this.addImageToCache(cacheKey, imageData);
      return imageData;
      
    } catch (error) {
      console.error(`❌ Error loading image: ${error.message}`);
      throw error;
    }
  }

  async addImageToCache(cacheKey, imageData) {
    // Memory management
    const newMemoryUsage = this.currentImageMemoryMB + imageData.sizeMB;
    if (newMemoryUsage > this.maxImageMemoryMB) {
      await this.evictImagesByMemory(imageData.sizeMB);
    }
    
    // Size management
    if (this.imageCache.size >= this.maxImageCacheSize) {
      this.evictImageLRU();
    }

    this.imageCache.set(cacheKey, imageData);
    this.currentImageMemoryMB += imageData.sizeMB;
    
    console.log(`💾 Image cached: ${this.imageCache.size}/${this.maxImageCacheSize}, ${this.currentImageMemoryMB.toFixed(1)}MB`);
  }

  trackImageAccess(imagePath) {
    const count = this.accessCount.get(imagePath) || 0;
    this.accessCount.set(imagePath, count + 1);
    
    if (count === this.preloadThreshold) {
      console.log(`🔥 Preloading popular image: ${path.basename(imagePath)}`);
      this.preloadImage(imagePath);
    }
  }

  // ==================== MENU DATA CACHING ====================

  generateMenuCacheKey(query = {}, options = {}) {
    const keyData = JSON.stringify({ query, options, type: 'menu' });
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  async getMenuData(query = {}, options = {}) {
    const cacheKey = this.generateMenuCacheKey(query, options);
    const now = Date.now();
    
    // Check if cached data exists and is still valid
    if (this.menuCache.has(cacheKey)) {
      const cached = this.menuCache.get(cacheKey);
      
      if (now - cached.timestamp < this.menuCacheExpiry) {
        this.stats.menu.hits++;
        console.log(`🎯 Menu Cache HIT: ${Object.keys(query).length ? 'filtered' : 'all'} menu data`);
        
        // Move to end (LRU)
        this.menuCache.delete(cacheKey);
        this.menuCache.set(cacheKey, cached);
        
        return cached.data;
      } else {
        // Expired - remove from cache
        this.menuCache.delete(cacheKey);
      }
    }

    // Cache miss or expired - fetch from database
    return await this.loadAndCacheMenuData(query, options, cacheKey);
  }

  async loadAndCacheMenuData(query, options, cacheKey) {
    this.stats.menu.misses++;
    console.log(`📋 Menu Cache MISS: Loading from database`);
    
    try {
      // Build query with population
      let dbQuery = MenuItem.find(query);
      
      if (options.populate) {
        dbQuery = dbQuery.populate('sizes.ingredients.ingredient');
      }
      
      if (options.sort) {
        dbQuery = dbQuery.sort(options.sort);
      }

      const menuItems = await dbQuery.exec();
      
      // Enhance menu items with image URLs and cache status
      const enhancedMenuItems = menuItems.map(item => {
        const itemObj = item.toObject();
        
        // Add dynamic image URLs
        itemObj.imageUrls = {
          port5000: item.image ? `http://localhost:5000/uploads/menu/${item.image}` : null,
          port8000: item.image ? `http://localhost:8000/uploads/menu/${item.image}` : null,
          dynamic: item.getImageUrl()
        };
        
        // Add cache status for images
        if (item.image) {
          const imagePath = `./uploads/menu/${item.image}`;
          const imageKey = this.generateImageCacheKey(imagePath);
          itemObj.imageCached = this.imageCache.has(imageKey);
        }
        
        return itemObj;
      });

      // Cache the result
      const cachedData = {
        data: enhancedMenuItems,
        timestamp: Date.now(),
        query: query,
        options: options
      };
      
      this.menuCache.set(cacheKey, cachedData);
      console.log(`💾 Menu data cached: ${enhancedMenuItems.length} items`);
      
      return enhancedMenuItems;
      
    } catch (error) {
      console.error(`❌ Error loading menu data: ${error.message}`);
      throw error;
    }
  }

  // ==================== CATEGORY-SPECIFIC CACHING ====================

  async getMenuByCategory(category) {
    return await this.getMenuData({ category, available: true }, { sort: { name: 1 } });
  }

  async getAvailableMenu() {
    return await this.getMenuData({ available: true }, { sort: { category: 1, name: 1 } });
  }

  async getMenuWithIngredients() {
    return await this.getMenuData({ available: true }, { 
      populate: true, 
      sort: { category: 1, name: 1 } 
    });
  }

  // ==================== PRELOADING & OPTIMIZATION ====================

  async preloadPopularItems() {
    console.log('🚀 Preloading popular menu items and images...');
    
    try {
      // Preload all available menu data
      await this.getAvailableMenu();
      
      // Preload menu images
      const menuItems = await MenuItem.find({ 
        available: true, 
        image: { $exists: true, $ne: null } 
      }, 'image');
      
      const imagePromises = menuItems.map(item => {
        const imagePath = `./uploads/menu/${item.image}`;
        return this.preloadImage(imagePath).catch(err => 
          console.log(`❌ Failed to preload: ${item.image}`)
        );
      });
      
      await Promise.allSettled(imagePromises);
      console.log(`✅ Preloaded ${menuItems.length} menu images`);
      
    } catch (error) {
      console.error('❌ Preloading failed:', error);
    }
  }

  async preloadImage(imagePath) {
    const cacheKey = this.generateImageCacheKey(imagePath);
    
    if (!this.imageCache.has(cacheKey)) {
      try {
        await this.loadAndCacheImage(imagePath, cacheKey);
      } catch (error) {
        throw error;
      }
    }
  }

  // ==================== CACHE INVALIDATION ====================

  invalidateMenuCache() {
    this.menuCache.clear();
    this.stats.menu.refreshes++;
    console.log('🔄 Menu cache invalidated');
  }

  async invalidateMenuItemCache(menuItemId) {
    // Clear menu data cache (since item changed)
    this.invalidateMenuCache();
    
    // Clear specific image if it exists
    try {
      const menuItem = await MenuItem.findById(menuItemId);
      if (menuItem && menuItem.image) {
        const imagePath = `./uploads/menu/${menuItem.image}`;
        this.clearImage(imagePath);
      }
    } catch (error) {
      console.log('Could not invalidate specific item cache');
    }
  }

  // ==================== UTILITY METHODS ====================

  evictImageLRU() {
    const oldestKey = this.imageCache.keys().next().value;
    const oldestData = this.imageCache.get(oldestKey);
    
    this.imageCache.delete(oldestKey);
    this.currentImageMemoryMB -= oldestData.sizeMB;
    this.stats.images.evictions++;
  }

  async evictImagesByMemory(neededMB) {
    const cacheEntries = Array.from(this.imageCache.entries()).sort((a, b) => 
      a[1].lastAccessed - b[1].lastAccessed
    );
    
    let freedMemory = 0;
    for (const [key, data] of cacheEntries) {
      if (freedMemory >= neededMB) break;
      
      this.imageCache.delete(key);
      freedMemory += data.sizeMB;
      this.currentImageMemoryMB -= data.sizeMB;
    }
  }

  clearImage(imagePath) {
    const cacheKey = this.generateImageCacheKey(imagePath);
    const cachedData = this.imageCache.get(cacheKey);
    
    if (cachedData) {
      this.imageCache.delete(cacheKey);
      this.currentImageMemoryMB -= cachedData.sizeMB;
      console.log(`🗑️  Cleared image: ${path.basename(imagePath)}`);
      return true;
    }
    return false;
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    return contentTypes[ext] || 'image/jpeg';
  }

  getStats() {
    const imageHitRate = this.stats.totalRequests > 0 
      ? ((this.stats.images.hits / this.stats.totalRequests) * 100).toFixed(1)
      : '0';
    
    const menuHitRate = (this.stats.menu.hits + this.stats.menu.misses) > 0
      ? ((this.stats.menu.hits / (this.stats.menu.hits + this.stats.menu.misses)) * 100).toFixed(1)
      : '0';

    return {
      images: {
        ...this.stats.images,
        hitRate: imageHitRate + '%',
        cacheSize: this.imageCache.size,
        memoryUsage: `${this.currentImageMemoryMB.toFixed(1)}MB / ${this.maxImageMemoryMB}MB`
      },
      menu: {
        ...this.stats.menu,
        hitRate: menuHitRate + '%',
        cacheSize: this.menuCache.size,
        cacheExpiry: `${this.menuCacheExpiry / 1000}s`
      },
      popular: Array.from(this.accessCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([path, count]) => ({ image: path.basename(path), requests: count }))
    };
  }

  clearAll() {
    this.imageCache.clear();
    this.menuCache.clear();
    this.currentImageMemoryMB = 0;
    this.accessCount.clear();
    console.log('🗑️  Cleared all caches');
  }
}

export default UnifiedMenuCache;