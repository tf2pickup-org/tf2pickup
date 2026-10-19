// Every htmx swap runs a view transition; only those started from the queue switcher animate the
// queue. Set or cleared before each one, so it's never stale when the old state is captured.
document.addEventListener('htmx:beforeTransition', event => {
  document.documentElement.toggleAttribute(
    'data-queue-switch',
    event.target instanceof Element && event.target.closest('.queue-switcher') !== null,
  )
})
