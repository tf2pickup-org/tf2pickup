import { gamemodeConfigs } from '../../../gamemodes/configs'
import { IconChevronDown, IconFilter2 } from '../../../html/components/icons'
import type { Gamemode } from '../../../shared/types/gamemode'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'

interface Filter {
  gamemode?: Gamemode | undefined
  gameClass?: Tf2ClassName | undefined
}

// Filters a game list at `baseUrl` by gamemode and, when `gameClasses` are given, by class played.
export function GamesFilter(
  props: Filter & {
    baseUrl: string
    gamemodes: Gamemode[]
    gameClasses?: Tf2ClassName[]
  },
) {
  const href = (filter: Filter) => {
    const params = new URLSearchParams(
      Object.entries(filter).filter((entry): entry is [string, string] => entry[1] !== undefined),
    )
    return params.size > 0 ? `${props.baseUrl}?${params}` : props.baseUrl
  }

  return (
    <div class="games-filter">
      <div class="games-filter-bar">
        <IconFilter2 />
        <FilterDropdown
          label="Mode:"
          value={props.gamemode}
          placeholder="All"
          options={props.gamemodes.map(gamemode => ({
            label: gamemode,
            href: href({
              gamemode,
              // a class the new gamemode doesn't have would match nothing
              gameClass: gamemodeConfigs[gamemode].classes.some(c => c.name === props.gameClass)
                ? props.gameClass
                : undefined,
            }),
            current: gamemode === props.gamemode,
          }))}
        />
        {props.gameClasses && (
          <>
            <span class="games-filter-divider" />
            <FilterDropdown
              label="Class:"
              value={props.gameClass}
              placeholder="All classes"
              options={props.gameClasses.map(gameClass => ({
                label: gameClass,
                href: href({ gamemode: props.gamemode, gameClass }),
                current: gameClass === props.gameClass,
              }))}
            />
          </>
        )}
      </div>
      <a href={props.baseUrl} class="games-filter-clear">
        Clear
      </a>
    </div>
  )
}

function FilterDropdown(props: {
  label: string
  value: string | undefined
  placeholder: string
  options: { label: string; href: string; current: boolean }[]
}) {
  return (
    <details class="games-filter-dropdown" data-dropdown>
      <summary>
        <span safe>{props.label}</span>
        {props.value ? (
          <span safe>{props.value}</span>
        ) : (
          <span class="games-filter-placeholder" safe>
            {props.placeholder}
          </span>
        )}
        <IconChevronDown class="games-filter-chevron" />
      </summary>
      <div class="games-filter-menu">
        {props.options.map(option => (
          <a
            href={option.href}
            aria-current={option.current ? 'true' : undefined}
            data-umami-event="filter-games"
            data-umami-event-filter={props.label}
            data-umami-event-value={option.label}
            safe
          >
            {option.label}
          </a>
        ))}
      </div>
    </details>
  )
}
