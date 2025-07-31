import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import multer from 'multer';
import NodeCache from 'node-cache';
import createHttpError from 'http-errors';
import fs from 'fs/promises';
import MenuItem from '../model/menuModel.js';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cache = new NodeCache({ stdTTL: 3600 });

const getUploadPath = () => {
  return path.join(__dirname, '../uploads/menu'); 
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = getUploadPath();
    console.log(`Upload destination: ${uploadPath}`);
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      console.log(`Directory created/verified: ${uploadPath}`);
      cb(null, uploadPath);
    } catch (err) {
      console.error(`Failed to create directory: ${err.message}`);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}-${file.originalname}`;
    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log(`File received: ${file.originalname}, mimetype: ${file.mimetype}`);
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');

const uploadMenuItemImage = asyncHandler(async (req, res, next) => {
  console.log(`Upload request received for port: ${config.port}`);
  console.log(`Upload path will be: ${getUploadPath()}`);

  // Only allow uploads on port 8000 (main system)
  if (config.port !== '8000') {
    return next(createHttpError(403, 'Image uploads are only allowed on the main system (port 8000)'));
  }

  const { menuItemId } = req.params;
  console.log(`Menu item ID: ${menuItemId}`);

  if (!mongoose.isValidObjectId(menuItemId)) {
    return next(createHttpError(400, 'Invalid menu item ID'));
  }

  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem) {
    return next(createHttpError(404, 'Menu item not found'));
  }

  upload(req, res, async (err) => {
    if (err) {
      console.error(`Multer error: ${err.message}`);
      return next(createHttpError(400, err.message));
    }
    if (!req.file) {
      console.error('No file received');
      return next(createHttpError(400, 'No file uploaded'));
    }

    console.log(`File uploaded to: ${req.file.path}`);
    console.log(`File details:`, req.file);

    try {
      const uploadPath = getUploadPath();

      // Delete existing image if it exists
      if (menuItem.image) {
        const oldImagePath = path.join(uploadPath, menuItem.image);
        try {
          await fs.unlink(oldImagePath);
          console.log(`Deleted old image: ${oldImagePath}`);
        } catch (error) {
          console.error(`Failed to delete old image: ${error.message}`);
        }
      }

      // Create processed filename
      const processedFilename = `processed-${req.file.filename}`;
      const processedImagePath = path.join(uploadPath, processedFilename);

      console.log(`Processing image to: ${processedImagePath}`);

      // Process image with sharp
      await sharp(req.file.path)
        .resize({ width: 800, height: 800, fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(processedImagePath);

      console.log(`Image processed successfully`);

      // Delete original uploaded file
      try {
        await fs.unlink(req.file.path);
        console.log(`Deleted original file: ${req.file.path}`);
      } catch (error) {
        console.error(`Failed to delete original file: ${error.message}`);
      }

      // Update menu item with new image info
      menuItem.image = processedFilename;
      menuItem.imageAlt = req.body.imageAlt || `Image of ${menuItem.name}`;
      
      // Single image URL - always pointing to port 8000
      const mainSystemUrl = process.env.MAIN_SYSTEM_URL || 'http://localhost:8000';
      menuItem.imageUrl = `${mainSystemUrl}/uploads/menu/${processedFilename}`;

      console.log(`Image URL created: ${menuItem.imageUrl}`);

      await menuItem.save();
      console.log(`Menu item updated with image: ${processedFilename}`);

      // Update cache
      const cacheKey = `menu-item-image-${menuItemId}`;
      cache.set(cacheKey, menuItem.imageUrl);

      res.status(200).json({
        message: 'Image uploaded successfully',
        menuItem: {
          _id: menuItem._id,
          image: menuItem.image,
          imageAlt: menuItem.imageAlt,
          imageUrl: menuItem.imageUrl,
          dynamicImageUrl: menuItem.getImageUrl(), // Using the method
        },
      });
    } catch (error) {
      console.error(`Processing error: ${error.message}`);
      next(createHttpError(500, `Failed to upload image: ${error.message}`));
    }
  });
});

export const getAllMenuItems = asyncHandler(async (req, res) => {
  const menus = await MenuItem.find().lean();

  const withImages = menus.map(menu => ({
    ...menu,
    imageUrl: menu.imageUrl || null,
    dynamicImageUrl: menu.image ? `${process.env.MAIN_SYSTEM_URL || 'http://localhost:8000'}/uploads/menu/${menu.image}` : null,
  }));

  res.status(200).json(withImages);
});

export const getMenuItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const menu = await MenuItem.findById(id);
  if (!menu) {
    res.status(404);
    throw new Error("Menu item not found");
  }

  res.status(200).json(menu.toObject({ virtuals: true }));
});

const deleteMenuItemImage = asyncHandler(async (req, res, next) => {
  // Only allow deletions on port 8000
  if (config.port !== '8000') {
    return next(createHttpError(403, 'Image deletion is only allowed on the main system (port 8000)'));
  }

  const { menuItemId } = req.params;

  if (!mongoose.isValidObjectId(menuItemId)) {
    return next(createHttpError(400, 'Invalid menu item ID'));
  }

  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem) {
    return next(createHttpError(404, 'Menu item not found'));
  }

  if (!menuItem.image) {
    return next(createHttpError(404, 'No image found for this menu item'));
  }

  const uploadPath = getUploadPath();
  const imagePath = path.join(uploadPath, menuItem.image);

  try {
    await fs.access(imagePath);
    await fs.unlink(imagePath);
    console.log(`Deleted image: ${imagePath}`);
  } catch (error) {
    console.error(`Failed to delete image: ${error.message}`);
  }

  // Clear image-related fields
  menuItem.image = null;
  menuItem.imageAlt = null;
  menuItem.imageUrl = null;
  await menuItem.save();

  // Clear cache
  const cacheKey = `menu-item-image-${menuItemId}`;
  cache.del(cacheKey);

  res.status(200).json({
    message: 'Image deleted successfully',
    menuItem: {
      _id: menuItem._id,
      image: null,
      imageAlt: null,
      imageUrl: null,
    },
  });
});

const getMenuItemImage = asyncHandler(async (req, res, next) => {
  const { menuItemId } = req.params;
  const port = req.query.port || config.port || '8000';

  const cacheKey = `menu-item-image-${menuItemId}-${port}`;
  const cachedImageUrl = cache.get(cacheKey);
  if (cachedImageUrl) {
    return res.status(200).json({ imageUrl: cachedImageUrl });
  }

  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem) {
    return next(createHttpError(404, 'Menu item not found'));
  }

  const imageUrl = port === '5000' ? menuItem.imageUrlPort5000 : menuItem.imageUrlPort8000;
  if (!imageUrl) {
    return next(createHttpError(404, 'No image found for this menu item'));
  }

  cache.set(cacheKey, imageUrl);

  res.status(200).json({ imageUrl });
});

export { uploadMenuItemImage, deleteMenuItemImage, getMenuItemImage };