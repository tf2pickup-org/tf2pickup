import { enabledGamemodes } from '../../shared/enabled-gamemodes'
import { gamemodeDisplayName } from '../../shared/gamemode-display-name'
import type { Gamemode } from '../../shared/types/gamemode'

export type GamemodeTab = Gamemode | 'all'

/**
 * A row of tabs to switch a surface between gamemodes. Renders nothing on
 * single-gamemode instances, where there is nothing to switch between.
 *
 * Two flavors:
 * - navigation (default): anchors to `hrefFn(tab)`, boosted like any link;
 * - `fragment`: buttons that `hx-get` `hrefFn(tab)` and swap it into
 *   `hxTarget` without touching the URL — for editors embedded in forms
 *   (admin panel, player edit, admin toolbox).
 */
export function GamemodeTabs(props: {
  active: GamemodeTab
  hrefFn: (tab: GamemodeTab) => string
  includeAll?: boolean
  hxTarget?: string
  fragment?: boolean
}) {
  if (enabledGamemodes.length <= 1) {
    return <></>
  }

  const tabs: GamemodeTab[] = props.includeAll
    ? ['all', ...enabledGamemodes]
    : [...enabledGamemodes]

  return (
    <div
      class="border-abru-light-15 bg-abru-dark-25 inline-flex flex-row flex-wrap gap-1 rounded-lg border p-1"
      role="tablist"
    >
      {tabs.map(tab => {
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
        const label = tab === 'all' ? 'All' : gamemodeDisplayName(tab)
        return props.fragment ? (
          <button
            type="button"
            hx-get={props.hrefFn(tab)}
            hx-swap="outerHTML"
            {...commonAttrs}
            safe
          >
            {label}
          </button>
        ) : (
          <a href={props.hrefFn(tab)} {...commonAttrs} safe>
            {label}
          </a>
        )
      })}
    </div>
  )
}
