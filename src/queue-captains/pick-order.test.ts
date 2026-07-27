import { describe, expect, it } from 'vitest'
import { _6v6 } from '../queue-auto/configs/6v6'
import { _9v9 } from '../queue-auto/configs/9v9'
import { Tf2Team } from '../shared/types/tf2-team'
import { pickOrder } from './pick-order'

const { blu, red } = Tf2Team

describe('pickOrder()', () => {
  describe('6v6', () => {
    it('runs BLU, then alternating pairs', () => {
      expect(pickOrder(_6v6)).toEqual([blu, red, red, blu, blu, red, red, blu, blu, red])
    })

    it('leaves ten turns — twelve slots minus the two captains', () => {
      expect(pickOrder(_6v6)).toHaveLength(10)
    })
  })

  describe('9v9', () => {
    it('keeps the same shape over sixteen turns', () => {
      expect(pickOrder(_9v9)).toEqual([
        blu,
        red,
        red,
        blu,
        blu,
        red,
        red,
        blu,
        blu,
        red,
        red,
        blu,
        blu,
        red,
        red,
        blu,
      ])
    })
  })

  it.each([
    ['6v6', _6v6],
    ['9v9', _9v9],
  ])('splits %s evenly between the teams', (_name, config) => {
    const order = pickOrder(config)
    expect(order.filter(team => team === blu)).toHaveLength(order.length / 2)
    expect(order.filter(team => team === red)).toHaveLength(order.length / 2)
  })
})
