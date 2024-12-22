import { IconDeviceFloppy } from '../../../html/components/icons'

export function SaveButton() {
  return (
    <button type="submit" class="button button--accent button--dense mt-2">
      <IconDeviceFloppy size={20} />
      <span>Save</span>
    </button>
  )
}
