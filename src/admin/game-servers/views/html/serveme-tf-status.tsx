import { IconCheck, IconX } from '../../../../html/components/icons'

export function ServemeTfStatus(props: { enabled: boolean }) {
  return props.enabled ? (
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
