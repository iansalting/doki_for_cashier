// controllers/imageUploadController.js
import MenuItem from '../model/menuModel.js';
import fs from 'fs';
import path from 'path';

const uploadMenuImage = async (req, res) => {
  try {
    const { menuId } = req.params;
    const { altText } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    // Find menu item
    const menuItem = await MenuItem.findById(menuId);
    if (!menuItem) {
      // Clean up uploaded file if menu not found
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
        code: 'MENU_NOT_FOUND'
      });
    }

    // Delete old image if exists
    if (menuItem.image) {
      const oldImagePath = path.join('./uploads/menu', menuItem.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
        console.log(`🗑️ Deleted old image: ${menuItem.image}`);
      }
    }

    // Update menu item with new image
    menuItem.image = req.file.filename;
    menuItem.imageAlt = altText || menuItem.name;
    await menuItem.save();

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/menu/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        menuId: menuItem._id,
        filename: req.file.filename,
        imageUrl: imageUrl,
        altText: menuItem.imageAlt,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    s
    // Clean up file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      code: 'UPLOAD_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteMenuImage = async (req, res) => {
  try {
    const { menuId } = req.params;

    const menuItem = await MenuItem.findById(menuId);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
        code: 'MENU_NOT_FOUND'
      });
    }

    if (!menuItem.image) {
      return res.status(400).json({
        success: false,
        error: 'No image to delete',
        code: 'NO_IMAGE'
      });
    }

    // Delete physical file
    const imagePath = path.join('./uploads/menu', menuItem.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`🗑️ Deleted image file: ${menuItem.image}`);
    }

    // Update database
    const oldImage = menuItem.image;
    menuItem.image = null;
    menuItem.imageAlt = null;
    await menuItem.save();

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        menuId: menuItem._id,
        deletedImage: oldImage
      }
    });

  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image',
      code: 'DELETE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const bulkUploadImages = async (req, res) => {
  try {
    const { imageMapping } = req.body; // { "menuName": "imageFileName" }
    
    if (!imageMapping || typeof imageMapping !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid image mapping provided',
        code: 'INVALID_MAPPING'
      });
    }

    const results = {
      successful: [],
      failed: [],
      total: Object.keys(imageMapping).length
    };

    for (const [menuName, imageFileName] of Object.entries(imageMapping)) {
      try {
        // Find menu item
        const menuItem = await MenuItem.findOne({ name: menuName });
        if (!menuItem) {
          results.failed.push({
            menuName,
            reason: 'Menu item not found',
            imageFileName
          });
          continue;
        }

        // Check if source image exists
        const sourcePath = path.join('./downloaded-menu-images', imageFileName);
        if (!fs.existsSync(sourcePath)) {
          results.failed.push({
            menuName,
            reason: 'Source image file not found',
            imageFileName
          });
          continue;
        }

        // Generate unique filename
        const fileExtension = path.extname(imageFileName);
        const sanitizedName = menuName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const uniqueFileName = `${sanitizedName}-${Date.now()}${fileExtension}`;
        const destinationPath = path.join('./uploads/menu', uniqueFileName);

        // Copy file
        fs.copyFileSync(sourcePath, destinationPath);

        // Update database - delete old image first
        if (menuItem.image) {
          const oldImagePath = path.join('./uploads/menu', menuItem.image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }

        menuItem.image = uniqueFileName;
        menuItem.imageAlt = menuName;
        await menuItem.save();

        results.successful.push({
          menuName,
          imageFileName: uniqueFileName,
          originalFile: imageFileName
        });

      } catch (error) {
        results.failed.push({
          menuName,
          reason: error.message,
          imageFileName
        });
      }
    }

    res.json({
      success: true,
      message: 'Bulk upload completed',
      data: results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk upload failed',
      code: 'BULK_UPLOAD_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getImageStatus = async (req, res) => {
  try {
    const menus = await MenuItem.find({}, 'name image imageAlt category');
    
    const stats = {
      total: menus.length,
      withImages: 0,
      withoutImages: 0,
      missingFiles: 0,
      items: []
    };

    menus.forEach(menu => {
      const hasImage = !!menu.image;
      let fileExists = false;

      if (hasImage) {
        const imagePath = path.join('./uploads/menu', menu.image);
        fileExists = fs.existsSync(imagePath);
        stats.withImages++;
        
        if (!fileExists) {
          stats.missingFiles++;
        }
      } else {
        stats.withoutImages++;
      }

      stats.items.push({
        _id: menu._id,
        name: menu.name,
        category: menu.category,
        hasImage,
        imageFile: menu.image,
        fileExists,
        imageUrl: hasImage && fileExists 
          ? `${req.protocol}://${req.get('host')}/uploads/menu/${menu.image}`
          : null
      });
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Image status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get image status',
      code: 'STATUS_ERROR'
    });
  }
};

export {
  uploadMenuImage,
  deleteMenuImage,
  bulkUploadImages,
  getImageStatus
};