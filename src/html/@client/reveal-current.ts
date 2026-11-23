import { onLoadWithAttr } from './on-load-with-attr.js'

// not scrollIntoView(): it would scroll the page too
onLoadWithAttr('data-reveal-current', container => {
  const current = container.querySelector('[aria-current]')
  if (!current) return

  const c = container.getBoundingClientRect()
  const a = current.getBoundingClientRect()
  if (a.left < c.left || a.right > c.right) {
    container.scrollLeft += a.left - c.left - (c.width - a.width) / 2
  }
})
