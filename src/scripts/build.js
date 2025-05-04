const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Run the Vite build
console.log('Building the extension...');
execSync('npm run build', { stdio: 'inherit' });

// Create icons directory in dist
const iconsDir = path.join(__dirname, '../dist/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Copy manifest to dist
console.log('Copying manifest.json to dist...');
fs.copyFileSync(
  path.join(__dirname, '../manifest.json'),
  path.join(__dirname, '../dist/manifest.json')
);

// Create placeholder icons (in a real project, you'd have actual icons)
console.log('Creating placeholder icons...');
const createPlaceholderIcon = (size) => {
  const svgContent = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#3498db"/>
      <text x="50%" y="50%" font-family="Arial" font-size="${size/4}" 
            fill="white" text-anchor="middle" dominant-baseline="middle">VX</text>
    </svg>
  `;
  
  fs.writeFileSync(
    path.join(iconsDir, `icon${size}.png`),
    Buffer.from(svgContent)
  );
};

createPlaceholderIcon(16);
createPlaceholderIcon(48);
createPlaceholderIcon(128);

console.log('Build completed! The extension is ready in the dist folder.');