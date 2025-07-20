// server/scripts/checkMenuItems.js
import mongoose from 'mongoose';
import MenuItem from '../model/menuModel.js';
import dbConnection from "../config/db.js";

dbConnection();

async function checkMenuItems() {
  try {
    console.log('🔍 Checking existing menu items in database...\n');
    
    const menuItems = await MenuItem.find({}, 'name category available');
    
    if (menuItems.length === 0) {
      console.log('❌ No menu items found in database!');
      console.log('💡 Make sure you have menu items in your database first.');
    } else {
      console.log(`📋 Found ${menuItems.length} menu items:\n`);
      
      // Group by category
      const groupedItems = {};
      menuItems.forEach(item => {
        if (!groupedItems[item.category]) {
          groupedItems[item.category] = [];
        }
        groupedItems[item.category].push(item);
      });
      
      // Display grouped items
      Object.keys(groupedItems).forEach(category => {
        console.log(`📂 ${category.toUpperCase()}:`);
        groupedItems[category].forEach(item => {
          const status = item.available ? '✅' : '❌';
          console.log(`   ${status} "${item.name}"`);
        });
        console.log('');
      });
      
      console.log('💡 Use these exact names in your imageMapping object!');
      console.log('💡 Example imageMapping:');
      console.log('const imageMapping = {');
      menuItems.slice(0, 3).forEach(item => {
        const filename = item.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') + '.jpg';
        console.log(`  "${item.name}": "${filename}",`);
      });
      console.log('  // ... add more mappings');
      console.log('};');
    }
    
  } catch (error) {
    console.error('❌ Error checking menu items:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkMenuItems();