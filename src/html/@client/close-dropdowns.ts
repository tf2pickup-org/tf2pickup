function closeDropdowns(except?: Node) {
  for (const dropdown of document.querySelectorAll<HTMLDetailsElement>(
    'details[data-dropdown][open]',
  )) {
    if (!except || !dropdown.contains(except)) {
      dropdown.open = false
    }
  }
}

document.addEventListener('click', event => {
  closeDropdowns(event.target as Node)
})

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeDropdowns()
  }
})
