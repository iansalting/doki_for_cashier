
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import MenuItem from '../model/menuModel.js';
import dbConnection from "../config/db.js";

dbConnection();

const imageMapping = {

  "Doki Ramen": "dokiRamen.jpg",
  "Miso Ramen": "misoRamen.jpg",
  "Shio Ramen": "shioRamen.jpg",
  "Shoyu Ramen": "shoyuRamen.jpg",
  "Tantanmen Ramen": "tantanmenRamen.jpg",
  "Tonkotsu Ramen": "tonkotsuRamen.jpg"
};


const IMAGES_SOURCE_FOLDER = "./downloaded-menu-images";
const IMAGES_DESTINATION_FOLDER = './uploads/menu';

// Ensure destination folder exists
if (!fs.existsSync(IMAGES_DESTINATION_FOLDER)) {
  fs.mkdirSync(IMAGES_DESTINATION_FOLDER, { recursive: true });
  console.log('📁 Created uploads/menu directory');
}

async function uploadMenuImages() {
  try {
    console.log('🚀 Starting bulk image upload...');
    console.log('📁 Source folder:', path.resolve(IMAGES_SOURCE_FOLDER));
    console.log('📁 Destination folder:', path.resolve(IMAGES_DESTINATION_FOLDER));
    
    let successCount = 0;
    let errorCount = 0;
    
    console.log('\n🔍 Checking existing menu items...');
    const allMenuItems = await MenuItem.find({}, 'name category');
    console.log('📋 Found menu items:');
    allMenuItems.forEach(item => console.log(`  - ${item.name} (${item.category})`));
    
    console.log('\n📷 Processing image mappings...');
    
    for (const [menuItemName, imageFileName] of Object.entries(imageMapping)) {
      console.log(`\n📷 Processing: ${menuItemName}`);
      
      // Find the menu item in database
      const menuItem = await MenuItem.findOne({ name: menuItemName });
      
      if (!menuItem) {
        console.log(`❌ Menu item not found: ${menuItemName}`);
        console.log(`   💡 Available items: ${allMenuItems.map(item => item.name).join(', ')}`);
        errorCount++;
        continue;
      }
      
      // Check if image file exists
      const sourceImagePath = path.resolve(IMAGES_SOURCE_FOLDER, imageFileName);
      if (!fs.existsSync(sourceImagePath)) {
        console.log(`❌ Image file not found: ${sourceImagePath}`);
        errorCount++;
        continue;
      }
      
      // Generate unique filename for destination
      const fileExtension = path.extname(imageFileName);
      const sanitizedName = menuItemName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const uniqueFileName = `${sanitizedName}-${Date.now()}${fileExtension}`;
      const destinationPath = path.resolve(IMAGES_DESTINATION_FOLDER, uniqueFileName);
      
      try {
        // Copy image to uploads folder
        fs.copyFileSync(sourceImagePath, destinationPath);
        console.log(`📁 Copied: ${imageFileName} → ${uniqueFileName}`);
        
        // Update menu item with image path
        menuItem.image = uniqueFileName;
        menuItem.imageAlt = menuItemName;
        await menuItem.save();
        
        console.log(`✅ Successfully uploaded image for: ${menuItemName}`);
        successCount++;
      } catch (error) {
        console.log(`❌ Error processing ${menuItemName}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Bulk upload completed!');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (successCount > 0) {
      console.log('\n📋 Updated menu items:');
      const updatedItems = await MenuItem.find({ image: { $exists: true, $ne: null } }, 'name image imageAlt');
      updatedItems.forEach(item => {
        console.log(`  ✅ ${item.name} → ${item.image}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Bulk upload failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the upload
uploadMenuImages();