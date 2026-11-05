// Builds the PWA / favicon PNGs from the vector logo in public/brand/.
import sharp from 'sharp'

const MARK = 'public/brand/hijraa-mark.svg'     // hearts + heartbeat + "Hijraa"
const HEARTS = 'public/brand/hijraa-hearts.svg' // hearts only, for tiny sizes

async function icon(src, size, pad, out) {
  const inner = Math.round(size * (1 - 2 * pad))
  const art = await sharp(src, { density: 600 }).resize(inner, inner, { fit: 'contain', background: '#ffffff00' }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
    .composite([{ input: art, gravity: 'center' }]).png().toFile(out)
}

await icon(MARK, 192, 0.08, 'public/icons/icon-192.png')
await icon(MARK, 512, 0.08, 'public/icons/icon-512.png')
await icon(MARK, 512, 0.2, 'public/icons/icon-maskable-512.png') // keeps art inside the maskable safe zone
await icon(MARK, 180, 0.1, 'public/icons/apple-touch-icon.png')
await icon(HEARTS, 48, 0.04, 'src/app/icon.png')
console.log('icons written')
