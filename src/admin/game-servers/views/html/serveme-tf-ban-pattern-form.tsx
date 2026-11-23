// Declared outside the settings form, since forms can't nest; the pattern input and its button
// join it with their `form` attribute.
export function ServemeTfBanPatternForm() {
  return (
    <form
      id="servemeTfBanPatternForm"
      method="post"
      action="/admin/game-servers/serveme-tf/ban-gameservers"
      hx-post="/admin/game-servers/serveme-tf/ban-gameservers"
      hx-target="#bannedGameServersList"
      hx-swap="outerHTML"
      data-reset-on-success
    />
  )
}
