import htmx from 'htmx.org'

const thumbnailUrlTemplate = `${THUMBNAIL_SERVICE_URL}/unsafe/{width}x{height}/{map}.jpg`

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

    const mapName = entry.target.getAttribute('data-map-thumbnail')
    if (!mapName) {
      console.warn('No map name found for map thumbnail')
      continue
    }

    const thumbnailSrc = thumbnailUrlTemplate
      .replace('{width}', width.toString())
      .replace('{height}', height.toString())
      .replace('{map}', mapName)
    img.src = thumbnailSrc
  }
})

htmx.onLoad(element => {
  if (element.hasAttribute('data-map-thumbnail')) {
    resizeObserver.observe(element)
  }

  element.querySelectorAll('[data-map-thumbnail]').forEach(element => {
    resizeObserver.observe(element)
  })
})

window.addEventListener('load', () => {
  document.querySelectorAll('[data-map-thumbnail]').forEach(element => {
    resizeObserver.observe(element)
  })
})
