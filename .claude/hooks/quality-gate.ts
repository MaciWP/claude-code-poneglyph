import { $ } from 'bun'

const file = process.argv[2]
if (!file) {
  process.exit(0)
}

const ext = file.split('.').pop()?.toLowerCase()

const SUPPORTED_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'json']

if (!ext || !SUPPORTED_EXTENSIONS.includes(ext)) {
  process.exit(0)
}

async function checkBiomeInstalled(): Promise<boolean> {
  try {
    await $`bunx biome --version`.quiet()
    return true
  } catch {
    return false
  }
}

async function formatWithBiome(filePath: string): Promise<void> {
  try {
    await $`bunx biome check ${filePath} --write`.quiet()
  } catch {
    // Biome check failed, try format only
    try {
      await $`bunx biome format ${filePath} --write`.quiet()
    } catch {
      // Ignore format errors
    }
  }
}

async function main(): Promise<void> {
  const hasBiome = await checkBiomeInstalled()

  if (!hasBiome) {
    // Fallback: no formatting if biome not available
    process.exit(0)
  }

  await formatWithBiome(file)
}

main().catch(() => process.exit(0))
