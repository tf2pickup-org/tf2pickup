import htmx from './htmx.js'

const attrName = 'data-toggle-disabled-form'

function getFormControl(form: HTMLFormElement, name: string) {
  const control = form.elements.namedItem(name)
  return control instanceof RadioNodeList
    ? control
    : control instanceof HTMLElement
      ? control
      : null
}

function isEnabled(element: HTMLElement, form: HTMLFormElement) {
  const controlName = element.dataset['toggleDisabledControl']
  if (!controlName) return true

  const control = getFormControl(form, controlName)
  if (!control) return true

  const checkedValue = element.dataset['toggleDisabledChecked']
  if (checkedValue !== undefined && control instanceof HTMLInputElement) {
    return control.checked === (checkedValue === 'true')
  }

  const value = element.dataset['toggleDisabledValue']
  if (value !== undefined) {
    return control instanceof RadioNodeList
      ? control.value === value
      : 'value' in control && control.value === value
  }

  return true
}

function init(element: HTMLElement) {
  if (element.dataset['toggleDisabledInitialized'] === 'true') return

  const formSelector = element.getAttribute(attrName)
  const form = formSelector ? document.querySelector(formSelector) : element.closest('form')
  if (!(form instanceof HTMLFormElement)) return

  const update = () => {
    element.toggleAttribute('disabled', !isEnabled(element, form))
  }

  element.dataset['toggleDisabledInitialized'] = 'true'
  form.addEventListener('change', update)
  update()
}

htmx.onLoad(element => {
  if (!(element instanceof HTMLElement)) return

  if (element.hasAttribute(attrName)) {
    init(element)
  }

  element.querySelectorAll(`[${attrName}]`).forEach(element => {
    if (element instanceof HTMLElement) {
      init(element)
    }
  })
})
