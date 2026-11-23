import { SaveButton } from './save-button'

export function SaveBar() {
  return (
    <div class="save-bar" role="region" aria-label="Unsaved changes">
      <span class="flex flex-row items-center gap-2">
        <span class="save-bar-dot" aria-hidden="true" />
        Unsaved changes
      </span>
      <div class="flex flex-row items-center gap-2">
        <a href="" class="button" data-variant="darker" data-size="dense">
          Discard
        </a>
        <SaveButton class="button" data-umami-event="save-settings" />
      </div>
    </div>
  )
}
