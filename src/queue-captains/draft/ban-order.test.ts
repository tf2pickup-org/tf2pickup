import { describe, expect, it } from 'vitest'
import { Tf2Team } from '../../shared/types/tf2-team'
import { banOrder } from './ban-order'

const { blu, red } = Tf2Team

describe('banOrder()', () => {
  it('has RED ban first, evening out BLU picking first', () => {
    expect(banOrder(['a', 'b', 'c'])).toEqual([red, blu])
  })

  it('leaves exactly one map standing', () => {
    for (const size of [2, 3, 4, 5]) {
      const options = Array.from({ length: size }, (_, i) => `map${i}`)
      expect(banOrder(options)).toHaveLength(size - 1)
    }
  })

  it('has nothing to ban when there is only one option', () => {
    expect(banOrder(['only'])).toEqual([])
    expect(banOrder([])).toEqual([])
  })

  it('keeps alternating past the usual three', () => {
    expect(banOrder(['a', 'b', 'c', 'd', 'e'])).toEqual([red, blu, red, blu])
  })
})
