import { enabledGamemodes } from '../../shared/enabled-gamemodes'
import { gamemodeDisplayName } from '../../shared/gamemode-display-name'
import type { Gamemode } from '../../shared/types/gamemode'

/**
 * A row of tabs to switch a surface between gamemodes. Renders nothing on
 * single-gamemode instances, where there is nothing to switch between.
 *
 * With `fragment`, the tabs `hx-get` `hrefFn(tab)` and swap the response into
 * `hxTarget` without touching the URL — for per-gamemode editors embedded in a
 * form (the admin panel). Without it, they are boosted anchors.
 */
export function GamemodeTabs(props: {
  active: Gamemode
  hrefFn: (tab: Gamemode) => string
  hxTarget?: string
  fragment?: boolean
}) {
  if (enabledGamemodes.length <= 1) {
    return <></>
  }

  return (
    <div
      class="border-abru-light-15 bg-abru-dark-25 inline-flex flex-row flex-wrap gap-1 rounded-lg border p-1"
      role="tablist"
    >
      {enabledGamemodes.map(tab => {
        const active = tab === props.active
        const commonAttrs = {
          class: [
            'rounded-md px-3 py-1.5 text-sm leading-none font-bold whitespace-nowrap',
            active ? 'bg-accent text-white' : 'text-abru-light-60 hover:text-white',
          ],
          role: 'tab',
          'aria-selected': active ? 'true' : 'false',
          'data-umami-event': 'switch-gamemode',
          'data-umami-event-gamemode': tab,
          ...(props.hxTarget ? { 'hx-target': props.hxTarget } : {}),
        }
        return props.fragment ? (
          <button
            type="button"
            hx-get={props.hrefFn(tab)}
            hx-swap="outerHTML"
            {...commonAttrs}
            safe
          >
            {gamemodeDisplayName(tab)}
          </button>
        ) : (
          <a href={props.hrefFn(tab)} {...commonAttrs} safe>
            {gamemodeDisplayName(tab)}
          </a>
        )
      })}
    </div>
  )
}
