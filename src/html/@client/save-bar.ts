import { onLoadWithAttr } from './on-load-with-attr.js'

const attrName = 'data-save-bar'

function init(form: HTMLElement) {
  if (form.dataset['saveBarInitialized'] === 'true') return
  form.dataset['saveBarInitialized'] = 'true'

  const markDirty = (event: Event) => {
    if (event.target instanceof Element && event.target.closest('[data-save-bar-ignore]')) return
    form.toggleAttribute('data-dirty', true)
  }
  form.addEventListener('input', markDirty)
  form.addEventListener('change', markDirty)
  // a swap the page loads by itself (hx-get) is not a change made by the admin
  form.addEventListener('htmx:afterSwap', event => {
    const { requestConfig } = (event as CustomEvent<{ requestConfig?: { verb?: string } }>).detail
    if (requestConfig?.verb !== 'get') {
      markDirty(event)
    }
  })
  form.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('[data-remove-closest]')) {
      markDirty(event)
    }
  })
}

onLoadWithAttr(attrName, init)
