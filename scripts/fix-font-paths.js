const fs = require('fs');
const path = require('path');

// Recursively find all HTML files
function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const htmlFiles = findHtmlFiles('dist');
console.log(`Found ${htmlFiles.length} HTML files to process`);

htmlFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace font URLs from node_modules to /fonts/
  const fontUrlPattern = /\/assets\/node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\//g;
  
  if (fontUrlPattern.test(content)) {
    content = content.replace(fontUrlPattern, '/fonts/');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
});

console.log('Font path fixing complete!');

