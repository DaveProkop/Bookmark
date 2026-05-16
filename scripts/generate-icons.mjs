import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { mkdirSync } from 'fs'

// Purple gradient B icon
const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#b97df5"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>
  </defs>

  <!-- Rounded square background -->
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>

  <!-- Letter B as path (fill-rule evenodd creates the counters) -->
  <path fill="white" fill-rule="evenodd" d="
    M 98 68
    L 292 68
    Q 392 68 392 162
    Q 392 226 308 256
    Q 400 282 400 356
    Q 400 444 296 444
    L 98 444
    Z
    M 178 126
    L 282 126
    Q 334 126 334 172
    Q 334 218 282 218
    L 178 218
    Z
    M 178 294
    L 288 294
    Q 342 294 342 348
    Q 342 396 288 396
    L 178 396
    Z
  "/>
</svg>`

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon.svg', svg512)

const buf = Buffer.from(svg512)

await sharp(buf).resize(512, 512).png({ compressionLevel: 9 }).toFile('public/icons/icon-512.png')
console.log('✓ icon-512.png')

await sharp(buf).resize(192, 192).png({ compressionLevel: 9 }).toFile('public/icons/icon-192.png')
console.log('✓ icon-192.png')

console.log('Icons generated successfully!')
