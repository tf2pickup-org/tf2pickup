// Every open tab holds its own websocket, so without coordination a player with N
// tabs hears the same notification N times. Tabs race for a Web Lock keyed by the
// sound and only the winner plays.
//
// The lock is held briefly after playing so that tabs reacting to the same websocket
// message lose the race, while a notification arriving later still gets through.
const holdMs = 250

export async function playExclusively(soundId: string, play: () => void) {
  // Older Safari has no Web Locks; fall back to every tab playing, as before.
  if (!('locks' in navigator)) {
    play()
    return
  }

  await navigator.locks.request(soundId, { ifAvailable: true }, async lock => {
    if (!lock) return
    play()
    await new Promise(resolve => setTimeout(resolve, holdMs))
  })
}
