import { milliseconds } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { durationUnit } from './duration-unit'

describe('durationUnit.toMs', () => {
  it('converts a value and unit to milliseconds', () => {
    expect(durationUnit.toMs(30, 'minutes')).toBe(milliseconds({ minutes: 30 }))
    expect(durationUnit.toMs(2, 'months')).toBe(milliseconds({ months: 2 }))
  })
})

describe('durationUnit.split', () => {
  it('picks the largest whole unit that divides the duration evenly', () => {
    expect(durationUnit.split(milliseconds({ minutes: 30 }))).toEqual({
      value: 30,
      unit: 'minutes',
    })
    expect(durationUnit.split(milliseconds({ hours: 6 }))).toEqual({ value: 6, unit: 'hours' })
    expect(durationUnit.split(milliseconds({ weeks: 2 }))).toEqual({ value: 2, unit: 'weeks' })
    expect(durationUnit.split(milliseconds({ months: 1 }))).toEqual({ value: 1, unit: 'months' })
    expect(durationUnit.split(milliseconds({ years: 1 }))).toEqual({ value: 1, unit: 'years' })
  })

  it('tolerates date-fns month/year rounding (e.g. 6 months is 1ms off a whole multiple)', () => {
    expect(durationUnit.split(milliseconds({ months: 6 }))).toEqual({ value: 6, unit: 'months' })
    expect(durationUnit.split(milliseconds({ months: 3 }))).toEqual({ value: 3, unit: 'months' })
  })

  it('round-trips back to the original milliseconds', () => {
    const original = milliseconds({ days: 2 })
    const { value, unit } = durationUnit.split(original)
    expect(durationUnit.toMs(value, unit)).toBe(original)
  })

  it('falls back to minutes when nothing divides evenly', () => {
    expect(durationUnit.split(milliseconds({ minutes: 90 }))).toEqual({
      value: 90,
      unit: 'minutes',
    })
  })

  it('handles a zero duration', () => {
    expect(durationUnit.split(0)).toEqual({ value: 0, unit: 'minutes' })
  })
})
