// Hovering or focusing a player in the draft pool outlines the same player in every role column.
const attr = 'data-draft-player'

function toggle(target: EventTarget | null, on: boolean) {
  const player = (target as Element | null)?.closest(`[${attr}]`)?.getAttribute(attr)
  if (!player) return
  for (const element of document.querySelectorAll(`[${attr}="${CSS.escape(player)}"]`)) {
    element.toggleAttribute('data-highlight', on)
  }
}

for (const [event, on] of [
  ['mouseover', true],
  ['focusin', true],
  ['mouseout', false],
  ['focusout', false],
] as const) {
  document.addEventListener(event, e => {
    toggle(e.target, on)
  })
}
