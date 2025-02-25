import { IconDeviceFloppy } from '../../../html/components/icons'

export function SaveButton(props: JSX.HtmlButtonTag) {
  return (
    <button type="submit" class="button button--accent button--dense mt-2" {...props}>
      <IconDeviceFloppy size={20} />
      <span>Save</span>
    </button>
  )
}
