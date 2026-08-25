import { milliseconds, secondsToMilliseconds } from 'date-fns'

const units = ['minutes', 'hours', 'days', 'weeks', 'months', 'years'] as const
type Unit = (typeof units)[number]

// date-fns derives months/years from a fractional average day count, so e.g.
// milliseconds({ months: 6 }) lands 1ms off a whole multiple of milliseconds({ months: 1 }).
// Allow that slack so such durations still resolve to a friendly unit.
const tolerance = secondsToMilliseconds(1)

const unitMs: Record<Unit, number> = {
  minutes: milliseconds({ minutes: 1 }),
  hours: milliseconds({ hours: 1 }),
  days: milliseconds({ days: 1 }),
  weeks: milliseconds({ weeks: 1 }),
  months: milliseconds({ months: 1 }),
  years: milliseconds({ years: 1 }),
}

export const durationUnit = {
  all: units,

  toMs(value: number, unit: Unit): number {
    return value * unitMs[unit]
  },

  // Break a duration in milliseconds into the largest whole unit that divides it evenly,
  // so it can be shown back to the admin in the friendliest form.
  split(ms: number): { value: number; unit: Unit } {
    for (let i = units.length - 1; i >= 0; i--) {
      const unit = units[i]!
      const value = Math.round(ms / unitMs[unit])
      if (value >= 1 && Math.abs(value * unitMs[unit] - ms) <= tolerance) {
        return { value, unit }
      }
    }
    return { value: Math.round(ms / unitMs.minutes), unit: 'minutes' }
  },
}
