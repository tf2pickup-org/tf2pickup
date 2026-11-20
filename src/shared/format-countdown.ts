import { millisecondsToSeconds, minutesToSeconds } from 'date-fns'

const secondsPerMinute = minutesToSeconds(1)

export function formatCountdown(remainingMs: number): string {
  const totalSeconds = millisecondsToSeconds(remainingMs)
  const minutes = Math.floor(totalSeconds / secondsPerMinute)
  const seconds = totalSeconds % secondsPerMinute
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
