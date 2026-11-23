import { describe, expect, it } from 'vitest'
import { slugify } from './slugify'

describe('slugify()', () => {
  it.each([
    ['6v6', '6v6'],
    ['9v9 (restricted)', '9v9-restricted'],
    ['  Ultiduo  NA ', 'ultiduo-na'],
    ['Café 6v6', 'cafe-6v6'],
  ])('%s → %s', (name, slug) => {
    expect(slugify(name)).toBe(slug)
  })
})
