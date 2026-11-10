import htmx from './htmx'

// htmx restores focus after its own swaps, but the ws extension swaps via oobSwap, which doesn't.
let focused: Element | null = null

htmx.on('htmx:wsBeforeMessage', () => {
  focused = document.activeElement
})

htmx.on('htmx:wsAfterMessage', () => {
  const lost = focused
  focused = null
  if (!lost || lost.isConnected) return
  if (document.activeElement && document.activeElement !== document.body) return

  for (let el: Element | null = lost; el; el = el.parentElement) {
    if (!el.id) continue
    const replacement = document.getElementById(el.id)
    if (!replacement) continue
    if (el === lost) {
      replacement.focus()
      return
    }
    const href = lost.getAttribute('href')
    const sameLink = href
      ? replacement.querySelector<HTMLElement>(`[href="${CSS.escape(href)}"]`)
      : null
    const match =
      sameLink ??
      replacement.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled])') ??
      replacement.querySelector<HTMLElement>('a[href]')
    match?.focus()
    return
  }
})
