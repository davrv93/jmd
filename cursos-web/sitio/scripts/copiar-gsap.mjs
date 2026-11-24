import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'node_modules', 'gsap', 'dist');
const dstDir = path.join(root, 'public', 'vendor', 'gsap');

const files = ['gsap.min.js', 'ScrollTrigger.min.js', 'Flip.min.js'];

await fs.mkdir(dstDir, { recursive: true });
for (const f of files) {
  const src = path.join(srcDir, f);
  const dst = path.join(dstDir, f);
  await fs.copyFile(src, dst);
}
console.log(`ok gsap vendor → ${path.relative(root, dstDir)}/`);
