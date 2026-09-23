const slotSignatures = new Map<string, string>()

function slotSignature(slot: HTMLElement) {
  const player = slot.dataset.player ?? ''
  const ready = slot.querySelector<HTMLElement>('.player-info')?.dataset.playerReady ?? ''
  return `${player}:${ready}`
}

function slotKey(slot: HTMLElement) {
  return `${slot.dataset.gamemode ?? ''}:${slot.id}`
}

function rememberSlot(slot: HTMLElement, animateChanges: boolean) {
  const signature = slotSignature(slot)
  const key = slotKey(slot)
  const previous = slotSignatures.get(key)
  slotSignatures.set(key, signature)

  if (
    !animateChanges ||
    previous === undefined ||
    previous === signature ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return
  }

  slot.classList.add('queue-slot-updated')
  slot.addEventListener(
    'animationend',
    () => {
      slot.classList.remove('queue-slot-updated')
    },
    { once: true },
  )
}

function findSlots(node: Node) {
  if (!(node instanceof HTMLElement)) {
    return []
  }

  return [
    ...(node.matches('.queue-slot') ? [node] : []),
    ...node.querySelectorAll<HTMLElement>('.queue-slot'),
  ]
}

document.querySelectorAll<HTMLElement>('.queue-slot').forEach(slot => {
  rememberSlot(slot, false)
})

new MutationObserver(records => {
  records.forEach(record => {
    record.addedNodes.forEach(node => {
      findSlots(node).forEach(slot => {
        rememberSlot(slot, true)
      })
    })
  })
}).observe(document.body, { childList: true, subtree: true })
