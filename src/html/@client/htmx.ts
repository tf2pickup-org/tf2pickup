import htmx from 'htmx.org'

/* This is a workaround to make htmx extensions work */
window.htmx = htmx

htmx.on('htmx:oobErrorNoTarget', event => {
  console.log(
    `htmx:oobErrorNoTarget: ${(event as CustomEvent<{ content: Element }>).detail.content.id}`,
  )
})

// htmx.on('htmx:pushedIntoHistory', event => {
//   console.log(`navigated to ${(event as CustomEvent<{ path: string }>).detail.path}`)
// })

export default htmx
