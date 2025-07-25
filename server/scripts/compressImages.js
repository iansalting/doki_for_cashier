// scripts/compressImages.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const INPUT_DIR = './downloaded-menu-images';
const OUTPUT_DIR_1 = './uploads/menu';
const OUTPUT_DIR_2 = '../DOKIUSER/server/uploads/menu';

const compressImages = async () => {
  try {
    console.log('🖼️  Starting image compression...');
    
    // Ensure output directories exist
    [OUTPUT_DIR_1, OUTPUT_DIR_2].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });

    // Get all image files
    const imageFiles = fs.readdirSync(INPUT_DIR).filter(file => 
      /\.(jpg|jpeg|png)$/i.test(file)
    );

    console.log(`📋 Found ${imageFiles.length} images to compress`);

    for (const file of imageFiles) {
      const inputPath = path.join(INPUT_DIR, file);
      const fileName = path.parse(file).name;
      
      console.log(`\n🔄 Processing: ${file}`);
      
      // Get original file size
      const originalStats = fs.statSync(inputPath);
      const originalSize = (originalStats.size / 1024).toFixed(2);
      console.log(`   📏 Original size: ${originalSize} KB`);

      // Create optimized versions
      const timestamp = Date.now();
      const optimizedFileName = `${fileName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}.jpg`;

      // Create thumbnail (for menu grid)
      const thumbnailBuffer = await sharp(inputPath)
        .resize(400, 300, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ 
          quality: 85,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();

      // Save to both systems
      for (const outputDir of [OUTPUT_DIR_1, OUTPUT_DIR_2]) {
        const outputPath = path.join(outputDir, optimizedFileName);
        fs.writeFileSync(outputPath, thumbnailBuffer);
        
        const newStats = fs.statSync(outputPath);
        const newSize = (newStats.size / 1024).toFixed(2);
        const savings = ((originalStats.size - newStats.size) / originalStats.size * 100).toFixed(1);
        
        console.log(`   ✅ Saved to: ${outputDir}`);
        console.log(`   📉 New size: ${newSize} KB (${savings}% smaller)`);
      }

      // Update database with new filename
      console.log(`   💾 Update database: ${optimizedFileName}`);
    }

    console.log('\n🎉 Image compression completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run the database update script');
    console.log('2. Test your application');
    
  } catch (error) {
    console.error('❌ Compression failed:', error);
  }
};

compressImages();