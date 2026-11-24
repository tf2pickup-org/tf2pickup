import { onLoadWithAttr } from './on-load-with-attr.js'

const attrName = 'data-save-bar'

function init(form: HTMLElement) {
  if (form.dataset['saveBarInitialized'] === 'true') return
  form.dataset['saveBarInitialized'] = 'true'

  const markDirty = () => form.toggleAttribute('data-dirty', true)
  form.addEventListener('input', markDirty)
  form.addEventListener('change', markDirty)
  form.addEventListener('htmx:afterSwap', markDirty)
  form.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('[data-remove-closest]')) {
      markDirty()
    }
  })
}

onLoadWithAttr(attrName, init)
