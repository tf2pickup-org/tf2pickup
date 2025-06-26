import htmx from 'htmx.org'

/* This is a workaround to make htmx extensions work */
window.htmx = htmx

htmx.on('htmx:oobErrorNoTarget', event => {
  // @ts-expect-error not properly typed
  console.log(event.detail.content.id)
})

export default htmx
