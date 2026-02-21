import { Howl } from 'howler'

const MENTION_PREFIX = '★ '

let hasMention = false
let currentSound: Howl | null = null

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

  currentSound = new Howl({ src: ['/sounds/mention.webm'], volume: event.detail.volume })
  currentSound.play()

  chatTabButton()?.classList.add('has-mention')
  applyMentionTitle()
}

function clearMention() {
  hasMention = false

  currentSound?.stop()
  currentSound = null

  chatTabButton()?.classList.remove('has-mention')
  clearMentionTitle()
}

function maybeClear() {
  if (hasMention && isUserReadingChat()) {
    clearMention()
  }
}

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
