const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createCustomIcons() {
  try {
    const svgPath = path.join(__dirname, 'public', 'icons', 'icon.svg');
    
    // Check if SVG file exists
    if (!fs.existsSync(svgPath)) {
      console.error('Error: icon.svg not found in public/icons/');
      console.log('Please place your custom SVG icon in public/icons/icon.svg');
      return;
    }
    
    console.log('Using custom SVG icon to generate PWA icons...');
    
    // Generate 192x192 icon from SVG
    await sharp(svgPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(__dirname, 'public', 'icons', 'icon-192x192.png'));
    
    // Generate 512x512 icon from SVG
    await sharp(svgPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(__dirname, 'public', 'icons', 'icon-512x512.png'));
    
    // Generate 512x512 maskable icon from SVG (with padding)
    await sharp(svgPath)
      .resize(400, 400, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .extend({
        top: 56,
        bottom: 56,
        left: 56,
        right: 56,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(__dirname, 'public', 'icons', 'icon-512x512-maskable.png'));
    
    console.log('✅ Custom PWA icons generated successfully!');
    console.log('📁 Generated files:');
    console.log('  - public/icons/icon-192x192.png');
    console.log('  - public/icons/icon-512x512.png');
    console.log('  - public/icons/icon-512x512-maskable.png');
    console.log('\n💡 To use a different custom icon:');
    console.log('   1. Replace public/icons/icon.svg with your new SVG');
    console.log('   2. Run: node create-custom-icons.cjs');
    
  } catch (error) {
    console.error('❌ Error generating custom icons:', error);
    
    // Fallback to simple colored icons if SVG processing fails
    console.log('\n🔄 Falling back to colored square icons...');
    await createFallbackIcons();
  }
}

async function createFallbackIcons() {
  try {
    const bgColor = { r: 249, g: 115, b: 22, alpha: 1 }; // #f97316
    
    // Generate 192x192 fallback icon
    await sharp({
      create: {
        width: 192,
        height: 192,
        channels: 4,
        background: bgColor
      }
    })
    .png()
    .toFile(path.join(__dirname, 'public', 'icons', 'icon-192x192.png'));

    // Generate 512x512 fallback icon
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: bgColor
      }
    })
    .png()
    .toFile(path.join(__dirname, 'public', 'icons', 'icon-512x512.png'));

    // Generate 512x512 maskable fallback icon
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      }
    })
    .composite([{
      input: {
        create: {
          width: 400,
          height: 400,
          channels: 4,
          background: bgColor
        }
      },
      top: 56,
      left: 56
    }])
    .png()
    .toFile(path.join(__dirname, 'public', 'icons', 'icon-512x512-maskable.png'));
    
    console.log('✅ Fallback colored icons generated successfully!');
  } catch (fallbackError) {
    console.error('❌ Error generating fallback icons:', fallbackError);
  }
}

// Run the icon creation
createCustomIcons();