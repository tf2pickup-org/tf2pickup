import { capitalize } from 'es-toolkit'
import type { User } from '../../../auth/types/user'
import { configuration } from '../../../configuration'
import type { PlayerModel } from '../../../database/models/player.model'
import { IconDeviceFloppy, IconEdit, IconInputX } from '../../../html/components/icons'
import { queue } from '../../../queue'
import { WinLossChart } from './win-loss-chart'
import { GameClassSkillInput } from '../../../html/components/game-class-skill-input'

export async function AdminToolbox(props: {
  user?: User | undefined
  player: Pick<PlayerModel, 'skill' | 'steamId'>
}) {
  const { player } = props
  const defaultSkill = await configuration.get('games.default_player_skill')

  return (
    <form
      method="post"
      action={`/players/${player.steamId}/edit/skill`}
      class="player-admin-toolbox"
    >
      <h4 class="caption" style="grid-area: captionSkill">
        Skill
      </h4>
      <h4 class="caption" style="grid-area: captionWinLoss">
        Win-loss chart
      </h4>

      {queue.config.classes.map(gameClass => (
        <GameClassSkillInput
          gameClass={gameClass.name}
          name={`skill.${gameClass.name}`}
          value={player.skill?.[gameClass.name] ?? defaultSkill[gameClass.name] ?? 0}
          style={`grid-area: skill${capitalize(gameClass.name)}`}
        />
      ))}

      <button type="submit" class="button button--accent" style="grid-area: buttonSave">
        <IconDeviceFloppy size={20} />
        <span>Save</span>
      </button>

      <button
        type="button"
        class="button"
        style="grid-area: buttonReset"
        hx-get={`/players/${player.steamId}/edit/skill/default`}
        hx-trigger="click"
        hx-disabled-elt="this"
        hx-swap="none"
      >
        <IconInputX size={20} />
        Reset
      </button>

      <div class="mx-2" style="grid-area: winLoss">
        <WinLossChart steamId={props.player.steamId} />
      </div>

      <a
        href={`/players/${player.steamId}/edit`}
        class="button button--accent self-center whitespace-nowrap"
        style="grid-area: linkEdit"
      >
        <IconEdit />
        Edit player
      </a>
    </form>
  )
}

AdminToolbox.replaceSkillValues = async (props: { skill?: PlayerModel['skill'] }) => {
  const defaultSkill = await configuration.get('games.default_player_skill')
  return (
    <>
      {queue.config.classes.map(gameClass => {
        const s = props.skill?.[gameClass.name] ?? defaultSkill[gameClass.name] ?? 0
        return (
          <input
            type="number"
            id={`playerSkill${gameClass.name}`}
            hx-swap-oob="true"
            name={`skill.${gameClass.name}`}
            value={s.toString()}
            required
            step="1"
          />
        )
      })}
    </>
  )
}
