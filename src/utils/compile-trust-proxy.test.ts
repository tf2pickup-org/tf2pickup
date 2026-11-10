import { describe, expect, it } from 'vitest'
import { compileTrustProxy } from './compile-trust-proxy'

describe('compileTrustProxy', () => {
  it('trusts nothing when empty', () => {
    expect(compileTrustProxy('')('127.0.0.1', 0)).toBe(false)
  })

  it('trusts the listed ranges', () => {
    const trust = compileTrustProxy('loopback, uniquelocal,')
    expect(trust('127.0.0.1', 0)).toBe(true)
    expect(trust('10.0.0.1', 0)).toBe(true)
    expect(trust('198.51.100.9', 0)).toBe(false)
  })
})
