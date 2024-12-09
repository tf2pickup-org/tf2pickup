import htmx from './htmx.js'

const thumbnailServiceUrl = 'https://mapthumbnails.tf2pickup.org'
const thumbnailUrlTemplate = `${thumbnailServiceUrl}/unsafe/{width}x{height}/{map}.jpg`
const attrName = 'data-map-thumbnail'

const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const width = Math.round(entry.contentRect.width)
    const height = Math.round(entry.contentRect.height)
    if (width === 0 || height === 0) {
      continue
    }

    const tag = entry.target.children[0]
    if (!tag || tag.tagName !== 'IMG') {
      continue
    }

    const img = /** @type {HTMLImageElement} */ (tag)

    const mapName = entry.target.getAttribute(attrName)
    if (!mapName) {
      console.warn('No map name found for map thumbnail')
      continue
    }

    const thumbnailSrc = thumbnailUrlTemplate
      .replace('{width}', width.toString())
      .replace('{height}', height.toString())
      .replace('{map}', mapName)

    img.loading = 'lazy'
    img.onload = () => (img.style.opacity = '1')
    img.style.transitionProperty = 'opacity'
    img.style.transitionTimingFunction = 'cubic-bezier(0.4, 0, 0.2, 1)'
    img.style.transitionDuration = '150ms'
    img.style.opacity = '0'
    img.src = thumbnailSrc
  }
})

htmx.onLoad(element => {
  if (!(element instanceof HTMLElement)) {
    return
  }

  if (element.hasAttribute(attrName)) {
    resizeObserver.observe(element)
  }

  element.querySelectorAll(`[${attrName}]`).forEach(element => {
    resizeObserver.observe(element)
  })
})
