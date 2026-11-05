// Zips pc-gateway/ into public/downloads/hijraa-pc-gateway.zip (served by the app for the clinic PC).
import JSZip from 'jszip'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
const files = ['index.mjs', 'package.json', 'start.bat', 'start.command', 'README.txt']
const zip = new JSZip(); const dir = zip.folder('hijraa-pc-gateway')
for (const f of files) dir.file(f, readFileSync(`pc-gateway/${f}`), { unixPermissions: f === 'start.command' ? 0o755 : 0o644 })
mkdirSync('public/downloads', { recursive: true })
writeFileSync('public/downloads/hijraa-pc-gateway.zip', await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', platform: 'UNIX' }))
console.log('[pack] public/downloads/hijraa-pc-gateway.zip')
