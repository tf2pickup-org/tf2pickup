import { IconCheck, IconX } from '../../../../html/components/icons'
import { tf2QuickServer } from '../../../../tf2-quick-server'

export function Tf2QuickServerStatus() {
  return tf2QuickServer.isEnabled ? (
    <span class="flex flex-row text-green-600">
      <IconCheck />
      enabled
    </span>
  ) : (
    <span class="flex flex-row text-red-600">
      <IconX />
      disabled
    </span>
  )
}
