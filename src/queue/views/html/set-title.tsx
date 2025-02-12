import { environment } from '../../../environment'

export function SetTitle(props: { current: number; required: number }) {
  return (
    <div id="queue-notify-container" hx-swap-oob="beforeend">
      <script type="module" remove-me="0s">{`
        document.title='[${props.current}/${props.required}] ${environment.WEBSITE_NAME}';
      `}</script>
    </div>
  )
}
