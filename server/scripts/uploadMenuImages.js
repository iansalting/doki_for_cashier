import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import MenuItem from "../model/menuModel.js";
import dbConnection from "../config/db.js";

dbConnection();

const imageMapping = {
  "DOKI Ramen": "dokiRamen.jpg",
  "Miso Ramen": "misoRamen.jpg",
  "Shio Ramen": "shioRamen.jpg",
  "Shoyu Ramen": "shoyuRamen.jpg",
  "Tantanmen Ramen": "tantanmenRamen.jpg",
  "Tonkotsu Ramen": "tonkotsuRamen.jpg",
  "Chilli": "3.png",
  "Extra Mushroom": "1.png",
  "Extra Pork": "5.png",
  "Extra Egg": "6.png",
  "Extra Sesame": "4.png",
  "Extra Corn": "2.png",
   "Coke":"8.png",
   "Water":"7.png"
};

const IMAGES_SOURCE_FOLDER = "./downloaded-menu-images";

// Define destination folders for both systems
const IMAGES_DESTINATION_FOLDERS = [
  "./uploads/menu",
  "C:/Users/ian/DOKIUSER/server/uploads/menu",
];
// Ensure all destination folders exist
IMAGES_DESTINATION_FOLDERS.forEach((folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`📁 Created directory: ${folder}`);
  }
});

async function uploadMenuImages() {
  try {
    console.log("🚀 Starting bulk image upload for multiple systems...");
    console.log("📁 Source folder:", path.resolve(IMAGES_SOURCE_FOLDER));
    console.log("📁 Destination folders:");
    IMAGES_DESTINATION_FOLDERS.forEach((folder) => {
      console.log(`   - ${path.resolve(folder)}`);
    });

    let successCount = 0;
    let errorCount = 0;

    console.log("\n🔍 Checking existing menu items...");
    const allMenuItems = await MenuItem.find({}, "name category");
    console.log("📋 Found menu items:");
    allMenuItems.forEach((item) =>
      console.log(`  - ${item.name} (${item.category})`)
    );

    console.log("\n📷 Processing image mappings...");

    for (const [menuItemName, imageFileName] of Object.entries(imageMapping)) {
      console.log(`\n📷 Processing: ${menuItemName}`);

      // Find the menu item in database
      const menuItem = await MenuItem.findOne({ name: menuItemName });

      if (!menuItem) {
        console.log(`❌ Menu item not found: ${menuItemName}`);
        console.log(
          `   💡 Available items: ${allMenuItems
            .map((item) => item.name)
            .join(", ")}`
        );
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
      const sanitizedName = menuItemName
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase();
      const uniqueFileName = `${sanitizedName}-${Date.now()}${fileExtension}`;

      try {
        // Copy image to ALL destination folders
        let copySuccessCount = 0;

        IMAGES_DESTINATION_FOLDERS.forEach((folder, index) => {
          try {
            const destinationPath = path.resolve(folder, uniqueFileName);
            fs.copyFileSync(sourceImagePath, destinationPath);
            console.log(
              `📁 Copied to system ${index + 1}: ${folder}/${uniqueFileName}`
            );
            copySuccessCount++;
          } catch (copyError) {
            console.log(`❌ Failed to copy to ${folder}:`, copyError.message);
          }
        });

        if (copySuccessCount === 0) {
          throw new Error("Failed to copy to any destination folder");
        }

        // Update menu item with image path (only once in database)
        menuItem.image = uniqueFileName;
        menuItem.imageAlt = menuItemName;
        await menuItem.save();

        console.log(`✅ Successfully uploaded image for: ${menuItemName}`);
        console.log(
          `📋 Copied to ${copySuccessCount}/${IMAGES_DESTINATION_FOLDERS.length} systems`
        );
        console.log(`🔗 Will be available at:`);
        console.log(
          `   - http://localhost:5000/uploads/menu/${uniqueFileName}`
        );
        console.log(
          `   - http://localhost:8000/uploads/menu/${uniqueFileName}`
        );

        successCount++;
      } catch (error) {
        console.log(`❌ Error processing ${menuItemName}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n🎉 Multi-system bulk upload completed!");
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (successCount > 0) {
      console.log("\n📋 Updated menu items accessible from both systems:");
      const updatedItems = await MenuItem.find(
        { image: { $exists: true, $ne: null } },
        "name image imageAlt"
      );
      updatedItems.forEach((item) => {
        console.log(`  ✅ ${item.name} → ${item.image}`);
        console.log(
          `     🔗 Port 5000: http://localhost:5000/uploads/menu/${item.image}`
        );
        console.log(
          `     🔗 Port 8000: http://localhost:8000/uploads/menu/${item.image}`
        );
      });
    }
  } catch (error) {
    console.error("❌ Multi-system bulk upload failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the upload
uploadMenuImages();
