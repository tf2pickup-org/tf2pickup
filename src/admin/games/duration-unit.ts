import { milliseconds } from 'date-fns'

const units = ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'] as const
type Unit = (typeof units)[number]

// date-fns derives months/years from a fractional average day count, so e.g.
// milliseconds({ months: 6 }) lands 1ms off a whole multiple of milliseconds({ months: 1 }).
// The drift is at most ~1ms per unit, so allow that much slack and no more.

const unitMs: Record<Unit, number> = {
  seconds: milliseconds({ seconds: 1 }),
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
    return milliseconds({ [unit]: value })
  },

  // Break a duration in milliseconds into the largest whole unit that divides it evenly,
  // so it can be shown back to the admin in the friendliest form. When none does, it stays
  // in (fractional) seconds, so saving the form again keeps the exact value.
  split(ms: number): { value: number; unit: Unit } {
    for (let i = units.length - 1; i >= 0; i--) {
      const unit = units[i]!
      const value = Math.round(ms / unitMs[unit])
      if (value >= 1 && Math.abs(value * unitMs[unit] - ms) <= value) {
        return { value, unit }
      }
    }
    return { value: ms / unitMs.seconds, unit: 'seconds' }
  },

  // A duration spelled out for prose, e.g. "1 month" rather than "1 months".
  label(ms: number): string {
    const { value, unit } = durationUnit.split(ms)
    return `${value} ${value === 1 ? unit.slice(0, -1) : unit}`
  },
}
