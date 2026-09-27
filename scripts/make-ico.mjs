/**
 * Wraps public/icons/icon-512.png into a Windows .ico container
 * (PNG-compressed entry, valid on Vista+ — no image tools needed).
 * Run: node scripts/make-ico.mjs
 * Output: electron/icon.ico (overwritten)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'public', 'icons', 'icon-512.png');
const outDir = join(root, 'electron');
const out = join(outDir, 'icon.ico');

const png = readFileSync(src);
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!png.subarray(0, 8).equals(PNG_SIG)) throw new Error(`make-ico: not a PNG: ${src}`);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // count

const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0); // width 0 = 256+ (viewer scales the PNG)
entry.writeUInt8(0, 1); // height 0 = 256+
entry.writeUInt8(0, 2); // no palette
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4); // planes
entry.writeUInt16LE(32, 6); // bit depth
entry.writeUInt32LE(png.length, 8); // payload size
entry.writeUInt32LE(6 + 16, 12); // payload offset

mkdirSync(outDir, { recursive: true });
writeFileSync(out, Buffer.concat([header, entry, png]));
console.log(`make-ico: ${src} (${png.length} bytes) -> ${out}`);
