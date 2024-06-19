import { nanoid } from 'nanoid'
import { environment } from '../../../environment'

export function SetTitle(props: { current: number; required: number }) {
  const id = nanoid()
  return (
    <div id="queue-notify-container" hx-swap-oob="beforeend">
      <div
        id={id}
        _={`on load js document.title='[${props.current}/${props.required}] ${environment.WEBSITE_NAME}' end then remove me`}
      ></div>
    </div>
  )
}
