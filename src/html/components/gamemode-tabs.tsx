import { enabledGamemodes } from '../../shared/enabled-gamemodes'
import type { Gamemode } from '../../shared/types/gamemode'

export type GamemodeTab = Gamemode | 'all'

/**
 * A row of tabs to filter a surface by gamemode. Renders nothing on
 * single-gamemode instances, where there is nothing to switch between.
 */
export function GamemodeTabs(props: {
  active: GamemodeTab
  hrefFn: (tab: GamemodeTab) => string
  includeAll?: boolean
  hxTarget?: string
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
        return (
          <a
            class={[
              'rounded-md px-4 py-2 leading-none font-bold',
              active
                ? 'bg-accent text-abru-light-3'
                : 'bg-abru-light-15 text-ash hover:bg-abru-light-25',
            ]}
            role="tab"
            href={props.hrefFn(tab)}
            aria-selected={active ? 'true' : 'false'}
            data-umami-event="switch-gamemode"
            data-umami-event-gamemode={tab}
            {...(props.hxTarget ? { 'hx-target': props.hxTarget } : {})}
            safe
          >
            {tab === 'all' ? 'All gamemodes' : tab}
          </a>
        )
      })}
    </div>
  )
}
