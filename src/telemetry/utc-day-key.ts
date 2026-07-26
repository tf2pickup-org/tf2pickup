/** UTC day, formatted as YYYY-MM-DD */
export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}
