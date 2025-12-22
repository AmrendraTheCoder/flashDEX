// Run with: bun scripts/generate-icons.ts
// This generates PNG icons from the SVG for PWA

import { $ } from 'bun'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

async function generateIcons() {
  // Create icons directory
  await $`mkdir -p public/icons`
  
  // For each size, we'll create a simple colored square with the logo
  // In production, you'd use sharp or canvas to convert SVG to PNG
  
  for (const size of sizes) {
    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="128" fill="url(#gradient)"/>
  <path d="M128 256L256 128L384 256L256 384L128 256Z" fill="white" fill-opacity="0.95"/>
  <path d="M192 256L256 192L320 256L256 320L192 256Z" fill="url(#gradient)"/>
  <defs>
    <linearGradient id="gradient" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6366f1"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
</svg>`
    
    await Bun.write(`public/icons/icon-${size}.svg`, svg)
    console.log(`Generated icon-${size}.svg`)
  }
  
  console.log('\nNote: For production, convert SVGs to PNGs using:')
  console.log('  - sharp (npm package)')
  console.log('  - ImageMagick: convert icon.svg -resize 192x192 icon-192.png')
  console.log('  - Online tools like realfavicongenerator.net')
}

generateIcons()