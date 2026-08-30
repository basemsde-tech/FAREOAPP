const fs = require('fs');
const path = require('path');

const wwwDir = path.join(__dirname, 'www');
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

const filesToCopy = [
  'index.html',
  '404.html',
  'sw.js',
  'manifest.webmanifest'
];

// Copy essential files
filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(wwwDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} -> www/`);
  }
});

// Copy any png/svg/webp/json assets in root
fs.readdirSync(__dirname).forEach(file => {
  if (/\.(png|jpg|jpeg|svg|webp|ico)$/i.test(file)) {
    fs.copyFileSync(path.join(__dirname, file), path.join(wwwDir, file));
    console.log(`Copied ${file} -> www/`);
  }
});

console.log('www build complete.');
