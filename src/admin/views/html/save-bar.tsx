import { SaveButton } from './save-button'

// Always there, so a form can be saved without JavaScript or without changes; it only stands out
// once the form has unsaved changes.
export function SaveBar() {
  return (
    <div class="save-bar" role="region" aria-label="Save changes">
      <span class="save-bar-status">
        <span class="save-bar-dot" aria-hidden="true" />
        Unsaved changes
      </span>
      <div class="flex flex-row items-center gap-2">
        <a href="" class="save-bar-discard button" data-variant="darker" data-size="dense">
          Discard
        </a>
        <SaveButton class="button" data-umami-event="save-settings" />
      </div>
    </div>
  )
}
