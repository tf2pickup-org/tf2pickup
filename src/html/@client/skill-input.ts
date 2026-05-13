import { onLoadWithAttr } from './on-load-with-attr.js'

function initSkillSpinner(spinner: HTMLElement) {
  const input = spinner.querySelector<HTMLInputElement>('input[type="number"]')
  const display = spinner.querySelector<HTMLElement>('.skill-spinner-display')
  if (!input || !display) return

  const step = parseFloat(input.step) || 1

  const nonNullDisplay = display
  const nonNullInput = input

  function updateDisplay() {
    nonNullDisplay.textContent = String(parseFloat(nonNullInput.value) || 0)
  }

  spinner
    .querySelector<HTMLButtonElement>('[data-action="decrement"]')
    ?.addEventListener('click', () => {
      input.value = String((parseFloat(input.value) || 0) - step)
      updateDisplay()
    })

  spinner
    .querySelector<HTMLButtonElement>('[data-action="increment"]')
    ?.addEventListener('click', () => {
      input.value = String((parseFloat(input.value) || 0) + step)
      updateDisplay()
    })
}

onLoadWithAttr('data-skill-spinner', initSkillSpinner)
