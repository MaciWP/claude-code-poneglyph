import { $ } from 'bun'

const PATTERNS: Record<string, RegExp> = {
  apiKeys: /(?:api[_-]?key|apikey)["\s]*[:=]["\s]*["']?[\w-]{20,}/gi,
  awsKeys: /AKIA[0-9A-Z]{16}/g,
  jwtSecrets: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
  privateKeys: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
  passwords: /(?:password|passwd|pwd)["\s]*[:=]["\s]*["'][^"']{8,}/gi,
  connectionStrings: /(?:mongodb|postgres|mysql|redis):\/\/[^\s"']+/gi,
  tokens: /(?:token|bearer|auth)["\s]*[:=]["\s]*["']?[A-Za-z0-9-_.]{20,}/gi,
}

const IGNORE_PATTERNS = [
  /\.test\.(ts|tsx|js)$/,
  /\.spec\.(ts|tsx|js)$/,
  /\.md$/,
  /node_modules/,
  /\.git/,
  /dist\//,
  /build\//,
]

async function scanFile(path: string): Promise<string[]> {
  if (IGNORE_PATTERNS.some(p => p.test(path))) {
    return []
  }

  try {
    const file = Bun.file(path)
    if (!(await file.exists())) return []

    const content = await file.text()
    const findings: string[] = []

    for (const [name, pattern] of Object.entries(PATTERNS)) {
      pattern.lastIndex = 0
      if (pattern.test(content)) {
        findings.push(`  - Posible ${name} en ${path}`)
      }
    }

    return findings
  } catch {
    return []
  }
}

async function main(): Promise<void> {
  const changedFiles = (await $`git diff --cached --name-only`.text())
    .split('\n')
    .filter(Boolean)

  if (changedFiles.length === 0) {
    console.log('No staged files to scan')
    return
  }

  const allFindings: string[] = []

  for (const file of changedFiles) {
    const findings = await scanFile(file)
    allFindings.push(...findings)
  }

  if (allFindings.length > 0) {
    console.log('SECURITY SCAN FAILED:')
    allFindings.forEach(f => console.log(f))
    console.log('\nReview these files before committing.')
    process.exit(1)
  }

  console.log('Security scan passed')
}

main().catch(console.error)
