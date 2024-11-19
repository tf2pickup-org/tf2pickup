import { nanoid } from 'nanoid'

export function RefreshPage() {
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div id={id} _={`init js location.reload() end`}></div>
    </div>
  )
}
