import sharp from 'sharp'
const svg = (pad) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#0b8a6e"/>
<g transform="translate(256 256) scale(${pad ? 0.72 : 0.9}) translate(-256 -256)">
<path d="M256 412c-8 0-15-3-21-8C150 330 96 282 96 210c0-55 43-98 96-98 27 0 49 11 64 31 15-20 37-31 64-31 53 0 96 43 96 98 0 72-54 120-139 194-6 5-13 8-21 8z" fill="#fff"/>
<rect x="232" y="176" width="48" height="152" rx="10" fill="#0b8a6e"/>
<rect x="180" y="228" width="152" height="48" rx="10" fill="#0b8a6e"/>
</g></svg>`)
await sharp(svg(false)).resize(192).png().toFile('public/icons/icon-192.png')
await sharp(svg(false)).resize(512).png().toFile('public/icons/icon-512.png')
await sharp(svg(true)).resize(512).png().toFile('public/icons/icon-maskable-512.png')
await sharp(svg(true)).resize(180).png().toFile('public/icons/apple-touch-icon.png')
await sharp(svg(false)).resize(48).png().toFile('src/app/icon.png')
