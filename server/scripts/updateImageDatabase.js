// scripts/updateImageDatabase.js
import fs from 'fs';
import mongoose from 'mongoose';
import MenuItem from '../model/menuModel.js';
import dbConnection from "../config/db.js";

dbConnection();

const updateDatabase = async () => {
  try {
    console.log('📋 Updating database with compressed image filenames...');
    
    // Get all compressed images
    const compressedImages = fs.readdirSync('./uploads/menu').filter(file => 
      /\.(jpg|jpeg)$/i.test(file)
    );

    console.log(`🖼️  Found ${compressedImages.length} compressed images`);

    // Mapping of menu names to compressed filenames
    const imageMapping = {};
    
    // Auto-detect mappings based on filename patterns
    compressedImages.forEach(filename => {
      // Extract menu name from filename (e.g., "doki-ramen-1234567890.jpg" -> "DOKI Ramen")
      const baseName = filename.split('-')[0];
      
      if (baseName.includes('doki')) {
        imageMapping['DOKI Ramen'] = filename;
      } else if (baseName.includes('miso')) {
        imageMapping['Miso Ramen'] = filename;
      } else if (baseName.includes('shio')) {
        imageMapping['Shio Ramen'] = filename;
      } else if (baseName.includes('shoyu')) {
        imageMapping['Shoyu Ramen'] = filename;
      } else if (baseName.includes('tantanmen')) {
        imageMapping['Tantanmen Ramen'] = filename;
      } else if (baseName.includes('tonkotsu')) {
        imageMapping['Tonkotsu Ramen'] = filename;
      }
    });

    console.log('\n📝 Image mappings detected:');
    Object.entries(imageMapping).forEach(([name, file]) => {
      console.log(`   ${name} → ${file}`);
    });

    // Update database
    let updateCount = 0;
    
    for (const [menuName, imageFile] of Object.entries(imageMapping)) {
      const menuItem = await MenuItem.findOne({ name: menuName });
      
      if (menuItem) {
        menuItem.image = imageFile;
        menuItem.imageAlt = menuName;
        await menuItem.save();
        
        console.log(`✅ Updated: ${menuName}`);
        updateCount++;
      } else {
        console.log(`❌ Not found: ${menuName}`);
      }
    }

    console.log(`\n🎉 Database update completed!`);
    console.log(`📊 Updated ${updateCount} menu items`);
    
    // Verify the updates
    console.log('\n🔍 Verification:');
    const updatedItems = await MenuItem.find({ image: { $exists: true, $ne: null } });
    updatedItems.forEach(item => {
      console.log(`   ✅ ${item.name} → ${item.image}`);
    });

  } catch (error) {
    console.error('❌ Database update failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

updateDatabase();