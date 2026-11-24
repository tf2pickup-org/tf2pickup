import { onLoadWithAttr } from './on-load-with-attr.js'
import { slugify } from './slugify.js'

const attrName = 'data-slug-from'

// Fills the slug from the named field until the admin edits it; clearing it resumes.
function init(slug: HTMLElement) {
  const source = document.getElementById(slug.getAttribute(attrName) ?? '')
  if (!(slug instanceof HTMLInputElement) || !(source instanceof HTMLInputElement)) return

  let follows = slug.value === ''
  slug.addEventListener('input', () => {
    follows = slug.value === ''
  })
  source.addEventListener('input', () => {
    if (follows) slug.value = slugify(source.value)
  })
}

onLoadWithAttr(attrName, init)
