import { isAudioBlocked } from './audio-blocked'

// Coordinates notification sounds across a browser's tabs so exactly one plays,
// instead of every tab beeping at once. Each play is claimed independently over a
// BroadcastChannel: a tab announces its claim, waits a short window to collect
// competing claims for the same sound, and plays only if it ranks highest.

const channelName = 'tf2pickup-sound'
// How long to collect competing claims before deciding. Same-browser tabs receive
// the triggering websocket message within a few ms of each other, so this window is
// generous while staying imperceptible.
const claimWindowMs = 60

const tabId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

interface Contender {
  tabId: string
  priority: number
}

interface ClaimMessage extends Contender {
  type: 'claim'
  soundId: string
}

interface StopMessage {
  type: 'stop'
  soundId: string
}

type Message = ClaimMessage | StopMessage

const channel = 'BroadcastChannel' in globalThis ? new BroadcastChannel(channelName) : null

// Claims seen recently, keyed by sound. Buffering (rather than only tracking once a
// local claim is in flight) tolerates tabs whose claim arrives slightly before ours.
const recentClaims = new Map<string, Contender[]>()

function recordClaim(soundId: string, contender: Contender) {
  const list = recentClaims.get(soundId) ?? []
  list.push(contender)
  recentClaims.set(soundId, list)
  setTimeout(() => {
    const current = recentClaims.get(soundId)
    if (!current) return
    const index = current.indexOf(contender)
    if (index >= 0) current.splice(index, 1)
    if (current.length === 0) recentClaims.delete(soundId)
  }, claimWindowMs * 2)
}

function outranks(a: Contender, b: Contender) {
  if (a.priority !== b.priority) return a.priority > b.priority
  return a.tabId > b.tabId
}

function currentPriority() {
  if (document.hasFocus()) return 3
  if (document.visibilityState === 'visible') return 2
  return 1
}

channel?.addEventListener('message', event => {
  const message = event.data as Message
  if (message.type === 'claim') {
    recordClaim(message.soundId, { tabId: message.tabId, priority: message.priority })
  } else {
    document.dispatchEvent(new CustomEvent('sound:stop', { detail: { soundId: message.soundId } }))
  }
})

export async function shouldPlaySound(soundId: string): Promise<boolean> {
  // Without a channel there's no coordination to do — play, matching prior behaviour.
  if (!channel) return true
  // A tab that can't play must never win the claim, or the notification is lost.
  if (isAudioBlocked()) return false

  const mine: Contender = { tabId, priority: currentPriority() }
  recordClaim(soundId, mine)
  channel.postMessage({ type: 'claim', soundId, ...mine } satisfies ClaimMessage)

  await new Promise<void>(resolve => setTimeout(resolve, claimWindowMs))

  const contenders = recentClaims.get(soundId) ?? [mine]
  const winner = contenders.reduce((best, contender) =>
    outranks(contender, best) ? contender : best,
  )
  return winner.tabId === tabId
}

export function broadcastStopSound(soundId: string) {
  channel?.postMessage({ type: 'stop', soundId } satisfies StopMessage)
}
