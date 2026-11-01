import { describe, expect, it } from 'vitest'
import { parseVerificationCode } from './parse-verification-code'

describe('parseVerificationCode()', () => {
  it.each([
    ['AB12-CD34', 'AB12CD34'],
    ['ab12cd34', 'AB12CD34'],
    [' AB12 CD34 ', 'AB12CD34'],
    ['<p>AB12-CD34</p>', 'AB12CD34'],
    ['ABOI-LD34', 'AB011D34'],
  ])('accepts %j', (message, code) => {
    expect(parseVerificationCode(message)).toEqual(code)
  })

  it.each(['hello', 'AB12-CD3', 'AB12-CD345', 'AB12-CDU4', ''])('rejects %j', message => {
    expect(parseVerificationCode(message)).toBeUndefined()
  })
})
