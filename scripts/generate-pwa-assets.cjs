const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'favicon.svg');

if (!fs.existsSync(svgPath)) {
  console.error('favicon.svg not found in public/');
  process.exit(1);
}

const svgBuffer = fs.readFileSync(svgPath);

// Generate icons
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('Generating icons...');
  for (const size of iconSizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`  Created ${path.basename(outputPath)}`);
  }
}

// Generate splash screens with centered logo
const splashScreens = [
  { width: 640, height: 1136, logoSize: 150 },   // iPhone SE
  { width: 750, height: 1334, logoSize: 180 },   // iPhone 8
  { width: 1242, height: 2208, logoSize: 280 },  // iPhone 8 Plus
  { width: 1125, height: 2436, logoSize: 260 },  // iPhone X/XS
  { width: 828, height: 1792, logoSize: 190 },   // iPhone XR
  { width: 1170, height: 2532, logoSize: 270 },  // iPhone 12/13/14
  { width: 1284, height: 2778, logoSize: 300 },  // iPhone 12/13 Pro Max
  { width: 1179, height: 2556, logoSize: 270 },  // iPhone 14 Pro
  { width: 1290, height: 2796, logoSize: 300 },  // iPhone 14 Pro Max
  { width: 1536, height: 2048, logoSize: 360 },  // iPad
  { width: 1668, height: 2224, logoSize: 390 },  // iPad Pro 10.5
  { width: 1668, height: 2388, logoSize: 390 },  // iPad Pro 11
  { width: 2048, height: 2732, logoSize: 480 },  // iPad Pro 12.9
];

async function generateSplashScreens() {
  console.log('Generating splash screens...');
  for (const splash of splashScreens) {
    const outputPath = path.join(publicDir, `splash-${splash.width}x${splash.height}.png`);
    
    // Create blue background
    const background = sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: { r: 59, g: 130, b: 246, alpha: 1 } // #3b82f6
      }
    }).png();

    // Resize logo
    const logo = await sharp(svgBuffer)
      .resize(splash.logoSize, splash.logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Composite logo centered
    await background
      .composite([{
        input: logo,
        gravity: 'center'
      }])
      .toFile(outputPath);
    
    console.log(`  Created ${path.basename(outputPath)}`);
  }
}

async function generateScreenshots() {
  console.log('Generating screenshots...');
  // Wide screenshot (desktop)
  const wideBg = sharp({
    create: { width: 1280, height: 720, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  }).png();
  const wideLogo = await sharp(svgBuffer).resize(200, 200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await wideBg.clone().composite([{ input: wideLogo, gravity: 'center' }]).toFile(path.join(publicDir, 'screenshot-wide.png'));
  console.log('  Created screenshot-wide.png');

  // Narrow screenshot (mobile)
  const narrowBg = sharp({
    create: { width: 720, height: 1280, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  }).png();
  const narrowLogo = await sharp(svgBuffer).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await narrowBg.clone().composite([{ input: narrowLogo, gravity: 'center' }]).toFile(path.join(publicDir, 'screenshot-narrow.png'));
  console.log('  Created screenshot-narrow.png');
}

async function main() {
  try {
    await generateIcons();
    await generateSplashScreens();
    await generateScreenshots();
    console.log('\nAll PWA assets generated successfully!');
  } catch (error) {
    console.error('Error generating assets:', error);
    process.exit(1);
  }
}

main();
