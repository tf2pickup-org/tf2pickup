import { afterEach, describe, expect, it, vi } from 'vitest'
import { environment } from '../environment'
import { isTestAuthSecret } from './is-test-auth-secret'

vi.mock('../environment', () => ({
  environment: { TEST_AUTH_SECRET: undefined as string | undefined },
}))

const secret = 'a'.repeat(32)

describe('isTestAuthSecret()', () => {
  afterEach(() => {
    environment.TEST_AUTH_SECRET = undefined
  })

  it('rejects everything when no secret is configured', () => {
    expect(isTestAuthSecret(undefined)).toBe(false)
    expect(isTestAuthSecret('')).toBe(false)
  })

  it('accepts only the configured secret', () => {
    environment.TEST_AUTH_SECRET = secret
    expect(isTestAuthSecret(secret)).toBe(true)
    expect(isTestAuthSecret('b'.repeat(32))).toBe(false)
    expect(isTestAuthSecret(undefined)).toBe(false)
  })
})
