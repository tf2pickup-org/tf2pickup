const inputSelector = "#chat-prompt input[type='text']"
const containerId = 'mention-completion'

let atIndex = -1
let abortController: AbortController | null = null

function getContainer(): HTMLElement | null {
  return document.getElementById(containerId)
}

function showDropdown(container: HTMLElement) {
  container.style.display = ''
}

function hideDropdown(container: HTMLElement) {
  container.style.display = 'none'
  container.innerHTML = ''
  atIndex = -1
}

function extractMentionQuery(text: string): { query: string; index: number } | null {
  const match = /(?:^|[ ])@([^\s]*)$/.exec(text)
  if (!match) {
    return null
  }
  const index = match.index + (match[0].startsWith('@') ? 0 : 1)
  return { query: match[1]!, index }
}

function getSelectedItem(container: HTMLElement): HTMLLIElement | null {
  return container.querySelector('li[aria-selected="true"]')
}

function selectItem(container: HTMLElement, item: HTMLLIElement) {
  container.querySelectorAll('li[aria-selected]').forEach(li => {
    li.removeAttribute('aria-selected')
  })
  item.setAttribute('aria-selected', 'true')
}

function acceptCompletion(input: HTMLInputElement, container: HTMLElement) {
  const selected = getSelectedItem(container)
  if (!selected) {
    return
  }

  const name = selected.dataset['name']
  if (!name) {
    return
  }

  const formatted = name.includes(' ') ? `@"${name}"` : `@${name}`
  const value = input.value
  const before = value.substring(0, atIndex)
  const after = value.substring(input.selectionStart ?? value.length)
  input.value = before + formatted + ' ' + after
  input.selectionStart = input.selectionEnd = before.length + formatted.length + 1

  hideDropdown(container)
}

async function fetchCompletions(query: string, container: HTMLElement) {
  if (abortController) {
    abortController.abort()
  }

  abortController = new AbortController()

  try {
    const response = await fetch(`/chat/mentions?q=${encodeURIComponent(query)}`, {
      signal: abortController.signal,
    })
    const html = await response.text()
    if (!html.trim()) {
      hideDropdown(container)
      return
    }

    container.innerHTML = html
    showDropdown(container)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return
    }
    hideDropdown(container)
  }
}

document.addEventListener('input', (e: Event) => {
  const input = e.target
  if (!(input instanceof HTMLInputElement)) {
    return
  }
  if (!input.matches(inputSelector)) {
    return
  }

  const container = getContainer()
  if (!container) {
    return
  }

  const textBeforeCursor = input.value.substring(0, input.selectionStart ?? input.value.length)
  const mention = extractMentionQuery(textBeforeCursor)

  if (!mention) {
    hideDropdown(container)
    return
  }

  atIndex = mention.index
  void fetchCompletions(mention.query, container)
})

document.addEventListener('keydown', (e: KeyboardEvent) => {
  const input = e.target
  if (!(input instanceof HTMLInputElement)) {
    return
  }
  if (!input.matches(inputSelector)) {
    return
  }

  const container = getContainer()
  if (!container || container.style.display === 'none') {
    return
  }

  const items = Array.from(container.querySelectorAll<HTMLLIElement>('li'))
  if (items.length === 0) {
    return
  }

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const currentIndex = items.findIndex(item => item.getAttribute('aria-selected') === 'true')
    let nextIndex: number
    if (e.key === 'ArrowDown') {
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
    }
    selectItem(container, items[nextIndex]!)
    return
  }

  if (e.key === 'Tab' || e.key === 'Enter') {
    e.preventDefault()
    acceptCompletion(input, container)
    return
  }

  if (e.key === 'Escape') {
    e.preventDefault()
    hideDropdown(container)
    return
  }
})

document.addEventListener('focusout', (e: FocusEvent) => {
  const input = e.target
  if (!(input instanceof HTMLInputElement)) {
    return
  }
  if (!input.matches(inputSelector)) {
    return
  }

  const container = getContainer()
  if (!container) {
    return
  }

  // Delay to allow mousedown on dropdown items to fire first
  setTimeout(() => {
    hideDropdown(container)
  }, 150)
})

document.addEventListener('mousedown', (e: MouseEvent) => {
  const target = e.target
  if (!(target instanceof HTMLElement)) {
    return
  }

  const li = target.closest<HTMLLIElement>('#mention-completion li')
  if (!li) {
    return
  }

  e.preventDefault()

  const container = getContainer()
  if (!container) {
    return
  }

  selectItem(container, li)

  const input = document.querySelector<HTMLInputElement>(inputSelector)
  if (input) {
    acceptCompletion(input, container)
  }
})
