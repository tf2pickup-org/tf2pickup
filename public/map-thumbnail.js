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

    const mapName = entry.target.getAttribute('data-map-name')
    if (!mapName) {
      console.warn('No map name found for map thumbnail')
      continue
    }

    const urlTemplate = entry.target.getAttribute('data-map-url-template')
    if (!urlTemplate) {
      console.warn('No map url template found for map thumbnail')
      continue
    }
    const thumbnailSrc = urlTemplate
      .replace('{width}', width.toString())
      .replace('{height}', height.toString())
      .replace('{map}', mapName)
    img.src = thumbnailSrc
  }
})

function addThumbnailObserver(/** @type {HTMLElement} */ element) {
  resizeObserver.observe(element)
}

window.addThumbnailObserver = addThumbnailObserver
