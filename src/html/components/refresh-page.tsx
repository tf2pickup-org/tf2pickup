import { nanoid } from 'nanoid'

export function RefreshPage() {
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div id={id} data-refresh-page></div>
    </div>
  )
}
