#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginDir = dirname(fileURLToPath(import.meta.url))
const profile = process.env.DSH_PROFILE ?? 'desktop'
const dsh = process.env.DSH_BIN ?? '/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh'
const args = ['plugin', '--profile', profile, 'add', `link:${pluginDir}`]
if (process.argv.includes('--dry-run')) {
  console.log([dsh, ...args].map(JSON.stringify).join(' '))
  process.exit(0)
}
const result = spawnSync(dsh, args, { stdio: 'inherit', env: process.env })
if (result.error) throw result.error
process.exit(result.status ?? 1)
