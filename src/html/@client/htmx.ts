import htmx from 'htmx.org'

/* This is a workaround to make htmx extensions work */
window.htmx = htmx

htmx.on('htmx:oobErrorNoTarget', event => {
  console.log(
    `htmx:oobErrorNoTarget: ${(event as CustomEvent<{ content: Element }>).detail.content.id}`,
  )
})

export default htmx
