import { IconCheck, IconX } from '../../../../html/components/icons'
import { servemeTf } from '../../../../serveme-tf'

export function ServemeTfStatus() {
  return servemeTf.isEnabled ? (
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
