import { createHash, timingSafeEqual } from 'node:crypto'
import { environment } from '../environment'

function sha256(value: string) {
  return createHash('sha256').update(value).digest()
}

export function isTestAuthSecret(given: string | undefined) {
  const expected = environment.TEST_AUTH_SECRET
  // hashing first gives timingSafeEqual equal-length inputs without leaking the secret's length
  return (
    expected !== undefined &&
    given !== undefined &&
    timingSafeEqual(sha256(given), sha256(expected))
  )
}
