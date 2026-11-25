import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'dsh-orquesta-0.2.0.zip')
const files = ['package.json', 'index.js', 'lib', 'skills', 'cordis.patch.yml', 'README.md', 'install.mjs']
const result = spawnSync('zip', ['-qr', output, ...files], { cwd: root, stdio: 'inherit' })
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status)
console.log(output)
