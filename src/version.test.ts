import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { version: packageVersion } = JSON.parse(
  (await readFile(new URL('../package.json', import.meta.url))).toString(),
) as { version: string }

describe('version', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('is the package version for tagged builds', async () => {
    vi.stubEnv('GIT_COMMIT', '')
    const { version } = await import('./version')
    expect(version).toBe(packageVersion)
  })

  it('appends the short commit sha for untagged builds', async () => {
    vi.stubEnv('GIT_COMMIT', 'd06c69ad0123456789abcdef0123456789abcdef')
    const { version } = await import('./version')
    expect(version).toBe(`${packageVersion}+d06c69a`)
  })
})
