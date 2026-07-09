import { enabledGamemodes } from '../../shared/enabled-gamemodes'
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
    <div class="flex flex-row flex-wrap gap-2" role="tablist">
      {tabs.map(tab => {
        const active = tab === props.active
        const commonAttrs = {
          class: [
            'rounded-md px-4 py-2 leading-none font-bold',
            active
              ? 'bg-accent text-abru-light-3'
              : 'bg-abru-light-15 text-ash hover:bg-abru-light-25',
          ],
          role: 'tab',
          'aria-selected': active ? 'true' : 'false',
          'data-umami-event': 'switch-gamemode',
          'data-umami-event-gamemode': tab,
          ...(props.hxTarget ? { 'hx-target': props.hxTarget } : {}),
        }
        const label = tab === 'all' ? 'All gamemodes' : tab
        return props.fragment ? (
          <button type="button" hx-get={props.hrefFn(tab)} hx-swap="outerHTML" {...commonAttrs}>
            {label}
          </button>
        ) : (
          <a href={props.hrefFn(tab)} {...commonAttrs}>
            {label}
          </a>
        )
      })}
    </div>
  )
}
