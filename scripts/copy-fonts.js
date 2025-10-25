const fs = require('fs');
const path = require('path');

// Create fonts directory in dist if it doesn't exist
const fontsDir = path.join(__dirname, '../dist/fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Source directory where Expo puts the fonts
const sourceFontsDir = path.join(
  __dirname,
  '../dist/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts'
);

// Check if source directory exists
if (fs.existsSync(sourceFontsDir)) {
  console.log('Copying fonts from:', sourceFontsDir);
  console.log('To:', fontsDir);
  
  // Get all .ttf files
  const files = fs.readdirSync(sourceFontsDir);
  const ttfFiles = files.filter(file => file.endsWith('.ttf'));
  
  // Copy each font file
  ttfFiles.forEach(file => {
    const sourcePath = path.join(sourceFontsDir, file);
    const destPath = path.join(fontsDir, file);
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied: ${file}`);
  });
  
  console.log(`Successfully copied ${ttfFiles.length} font files!`);
} else {
  console.warn('Source fonts directory not found:', sourceFontsDir);
  console.log('Skipping font copy - this is okay if fonts are bundled differently');
}

