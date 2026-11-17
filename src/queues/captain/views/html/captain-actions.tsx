import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { PreReadyUpButton } from '../../../../pre-ready/views/html/pre-ready-up-button'
import type { PoolView } from '../../types/pool-view'

// The buttons on the right of the toolbar: pre-ready, and while a draft runs, CANCEL DRAFT for the
// two captains.
export async function CaptainActions(props: { view: PoolView; viewer?: SteamId64 | undefined }) {
  const { draft } = props.view
  const isCaptain =
    !!props.viewer && !!draft && [draft.draft.red, draft.draft.blu].includes(props.viewer)
  return (
    <form id="captain-actions" ws-send class="queue-state-actions">
      <PreReadyUpButton actor={props.viewer} />
      {isCaptain ? (
        <button
          type="button"
          name="canceldraft"
          value=""
          class="button queue-clear-button max-lg:flex-1 max-lg:px-3 max-lg:text-sm max-lg:whitespace-nowrap"
          data-variant="accent"
          ws-send
          hx-trigger="click"
          data-ws-confirm="Cancel the draft? You will get a cooldown."
          data-umami-event="cancel-draft"
        >
          <span>Cancel draft</span>
        </button>
      ) : (
        <></>
      )}
    </form>
  )
}
