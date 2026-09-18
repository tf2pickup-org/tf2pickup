import { playSound, stopSound } from './play-sound'

const MENTION_PREFIX = '★ '
const mentionSoundId = 'sound-mention'

// Only one tab plays the mention sound, and every tab shows the star — so reading the
// chat in one tab has to clear the others too. It matters most for the sound: that
// clip is ~6s, where the rest are ~1.5s.
const channel = 'BroadcastChannel' in globalThis ? new BroadcastChannel('tf2pickup-mention') : null

let hasMention = false

function chatTabButton(): Element | null {
  return document.querySelector('[data-tabs-select="tab-chat"]')
}

function isChatVisible(): boolean {
  return chatTabButton()?.classList.contains('active') ?? false
}

function isUserReadingChat(): boolean {
  return document.visibilityState === 'visible' && isChatVisible()
}

function applyMentionTitle() {
  if (!document.title.startsWith(MENTION_PREFIX)) {
    document.title = MENTION_PREFIX + document.title
  }
}

function clearMentionTitle() {
  if (document.title.startsWith(MENTION_PREFIX)) {
    document.title = document.title.slice(MENTION_PREFIX.length)
  }
}

function setMention(event: CustomEvent<{ volume: number }>) {
  if (isUserReadingChat()) {
    return
  }

  hasMention = true
  playSound(document.getElementById(mentionSoundId), event.detail.volume)

  chatTabButton()?.classList.add('has-mention')
  applyMentionTitle()
}

function clearMention() {
  hasMention = false
  stopSound(document.getElementById(mentionSoundId))
  chatTabButton()?.classList.remove('has-mention')
  clearMentionTitle()
}

function maybeClear() {
  if (hasMention && isUserReadingChat()) {
    clearMention()
    channel?.postMessage('cleared')
  }
}

// BroadcastChannel does not echo to the sender, so this cannot loop back.
channel?.addEventListener('message', clearMention)

// Re-apply prefix if SetTitle overwrites document.title while mentioned
const titleObserver = new MutationObserver(() => {
  if (hasMention) {
    applyMentionTitle()
  }
})

const titleEl = document.querySelector('title')
if (titleEl) {
  titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true })
}

document.addEventListener('chat:mentioned', (event: Event) => {
  setMention(event as CustomEvent<{ volume: number }>)
})
document.addEventListener('visibilitychange', maybeClear)

// Also clear when user explicitly clicks the chat tab
document.addEventListener('click', event => {
  const target = event.target as Element | null
  if (target?.closest('[data-tabs-select="tab-chat"]')) {
    maybeClear()
  }
})
