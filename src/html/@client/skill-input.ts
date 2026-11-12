import { onLoadWithAttr } from './on-load-with-attr.js'

// Tells how many skills in the form differ from the saved ones.
function updateUnsaved(form: HTMLFormElement | null) {
  const output = form?.querySelector('[data-skill-unsaved]')
  if (!form || !output) return

  const count = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="number"]')).filter(
    input => input.value !== input.defaultValue,
  ).length
  output.textContent =
    count === 0 ? '' : `${count} unsaved skill ${count === 1 ? 'change' : 'changes'}`
}

function initSkillSpinner(spinner: HTMLElement) {
  const input = spinner.querySelector<HTMLInputElement>('input[type="number"]')
  const display = spinner.querySelector<HTMLElement>('.skill-spinner-display')
  if (!input || !display) return

  const step = parseFloat(input.step) || 1

  const nonNullDisplay = display
  const nonNullInput = input

  function updateDisplay() {
    nonNullDisplay.textContent = String(parseFloat(nonNullInput.value) || 0)
    updateUnsaved(spinner.closest('form'))
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
