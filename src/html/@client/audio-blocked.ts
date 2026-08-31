import { Howler } from 'howler'

function hasBeenActivated() {
  // navigator.userActivation is unavailable in some browsers (e.g. Safari)
  const activation = navigator.userActivation as UserActivation | undefined
  return activation?.hasBeenActive ?? false
}

export function isAudioBlocked() {
  // A suspended context is only truly blocked when the user has never interacted.
  // Howler's idle autoSuspend also suspends it for players who already have, and
  // resume() succeeds for them, so those must not count as blocked.
  return Howler.ctx.state === 'suspended' && !hasBeenActivated()
}
