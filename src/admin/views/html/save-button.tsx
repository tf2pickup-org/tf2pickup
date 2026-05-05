import { IconDeviceFloppy } from '../../../html/components/icons'

export function SaveButton(props: JSX.HtmlButtonTag) {
  return (
    <button type="submit" class="button mt-2" data-variant="accent" data-size="dense" {...props}>
      <IconDeviceFloppy size={20} />
      <span>Save</span>
    </button>
  )
}
