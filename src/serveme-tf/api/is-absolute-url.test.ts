import { expect, it } from 'vitest'
import { isAbsoluteUrl } from './is-absolute-url'

it('should return true for absolute urls', () => {
  expect(isAbsoluteUrl('http://example.com')).toBe(true)
})

it('should return false for relative urls', () => {
  expect(isAbsoluteUrl('/example')).toBe(false)
})
