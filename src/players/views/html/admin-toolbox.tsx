import type { User } from '../../../auth/types/user'
import { configuration } from '../../../configuration'
import type { PlayerModel } from '../../../database/models/player.model'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { IconChevronRight, IconDeviceFloppy, IconInputX } from '../../../html/components/icons'
import { queue } from '../../../queue'
import { WinLossChart } from './win-loss-chart'

export async function AdminToolbox(props: { user?: User | undefined; player: PlayerModel }) {
  const { player } = props
  const config = queue.config
  const defaultSkill = await configuration.get('games.default_player_skill')

  return (
    <form
      method="post"
      action={`/players/${player.steamId}/edit/skill`}
      class="grid items-center gap-x-6 gap-y-4 rounded-lg bg-abru-light-10/80 p-6 md:grid-cols-8"
    >
      <h4 class="text-lg font-bold text-abru-light-75 md:col-span-6">Skill</h4>
      <h4 class="text-lg font-bold text-abru-light-75 md:col-span-2">Win-loss chart</h4>

      {config.classes.map(gameClass => {
        const skill = player.skill?.[gameClass.name] ?? defaultSkill[gameClass.name] ?? 0
        return (
          <div class="player-skill">
            <GameClassIcon gameClass={gameClass.name} size={32} />
            <label class="sr-only" for={`playerSkill${gameClass.name}`}>
              Player's skill on {gameClass.name}
            </label>
            <input
              type="number"
              id={`playerSkill${gameClass.name}`}
              name={`skill.${gameClass.name}`}
              value={skill.toString()}
              required
              step="1"
            />
          </div>
        )
      })}
      <button
        type="button"
        class="button button--dense"
        hx-get={`/players/${player.steamId}/edit/skill/default`}
        hx-trigger="click"
        hx-swap="outerHTML"
        hx-disabled-elt="this"
      >
        <IconInputX />
        Reset
      </button>

      <button type="submit" class="button button--accent button--dense">
        <IconDeviceFloppy size={20} />
        <span>Save</span>
      </button>

      <div class="md:col-span-2">
        <WinLossChart />
      </div>

      <a
        href={`/players/${player.steamId}/edit`}
        class="flex flex-row justify-end text-abru-light-75 hover:underline md:col-start-8"
      >
        Edit player
        <IconChevronRight />
      </a>
    </form>
  )
}
