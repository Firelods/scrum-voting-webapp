// Script to generate icons for the Chrome extension
// Run with: node generate-icons.js

const fs = require('fs');
const path = require('path');

// SVG template for the icon
const createSvg = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Background circle -->
  <circle cx="64" cy="64" r="60" fill="url(#grad)"/>
  <!-- Letter S for Scrum -->
  <text x="64" y="82" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">S</text>
  <!-- Small J for Jira in bottom right -->
  <circle cx="100" cy="100" r="24" fill="#0052CC"/>
  <text x="100" y="110" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">J</text>
</svg>`;

const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const svg = createSvg(size);
  const filename = path.join(__dirname, `icon${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Created ${filename}`);
});

console.log('\nSVG icons created!');
console.log('To convert to PNG, you can use:');
console.log('  - Online converter: https://svgtopng.com/');
console.log('  - Or ImageMagick: convert icon128.svg icon128.png');
