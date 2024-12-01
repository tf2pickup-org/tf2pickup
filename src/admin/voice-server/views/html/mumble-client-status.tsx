import { mumble } from '../../../../mumble'
import { MumbleClientStatus as Status } from '../../../../mumble/status'

export function MumbleClientStatus() {
  let status = <></>
  switch (mumble.getStatus()) {
    case Status.disconnected:
      status = <span class="text-gray-700">disconnected</span>
      break
    case Status.connecting:
      status = <span class="text-yellow-600">connecting...</span>
      break
    case Status.connected:
      status = <span class="text-green-500">connected</span>
      break
    case Status.error:
      status = <span class="text-red-600">error</span>
      break
  }

  return (
    <div id="mumble-client-status-indicator" class="my-2">
      {status}
    </div>
  )
}
