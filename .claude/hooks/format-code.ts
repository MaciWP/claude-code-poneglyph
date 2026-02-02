#!/usr/bin/env bun
import { $ } from 'bun'

const input = JSON.parse(await Bun.stdin.text())
const filePath = input.tool_input?.file_path ?? ''
const ext = filePath.split('.').pop()?.toLowerCase()

const CODE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx']

if (ext && CODE_EXTENSIONS.includes(ext)) {
  try {
    await $`bunx eslint --fix --quiet ${filePath}`.quiet().nothrow()
  } catch { /* ignore */ }

  try {
    await $`bunx prettier --write --log-level silent ${filePath}`.quiet().nothrow()
  } catch { /* ignore */ }
}

process.exit(0)
