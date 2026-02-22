import { configuration } from '../../../configuration'
import type { PlayerModel } from '../../../database/models/player.model'
import { IconClover, IconDeviceFloppy, IconEdit, IconInputX } from '../../../html/components/icons'
import { queue } from '../../../queue'
import { WinLossChart } from './win-loss-chart'
import { GameClassSkillInput } from '../../../html/components/game-class-skill-input'
import { players } from '../..'
import { formatDistanceToNow } from 'date-fns'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { pluckLastEdit } from '../../pluck-last-edit'

export async function AdminToolbox(props: {
  player: Pick<PlayerModel, 'skill' | 'steamId' | 'skillHistory' | 'verified'>
}) {
  const { player } = props
  const defaultSkill = await configuration.get('games.default_player_skill')
  const requireVerification = await configuration.get('queue.require_player_verification')

  return (
    <div id="player-admin-toolbox">
      {requireVerification && (
        <div class="bg-abru-light-5 flex items-center gap-3 rounded-md px-3 py-2">
          <label for="playerVerified" class="cursor-pointer text-sm select-none">
            Player verified
          </label>
          <input
            type="checkbox"
            id="playerVerified"
            name="verified"
            value="true"
            checked={props.player.verified}
            hx-put={`/players/${player.steamId}/verify`}
            hx-trigger="change"
            hx-target="#player-admin-toolbox"
            hx-swap="outerHTML"
            hx-include="this"
          />
        </div>
      )}

      <form
        method="post"
        action={`/players/${player.steamId}/edit/skill`}
        class="player-admin-toolbox"
      >
        {player.skill === undefined && (
          <div class="col-span-full flex items-center gap-2 rounded-md bg-green-800/30 px-3 py-2 text-sm text-green-400">
            <IconClover size={16} />
            <span>This player has no skill assigned</span>
          </div>
        )}

        <h4 class="caption" style="grid-area: captionSkill">
          Skill
        </h4>
        <h4 class="caption" style="grid-area: captionWinLoss">
          Win-loss chart
        </h4>

        <div class={['skill-inputs', queue.config.classes.length > 4 && 'compact']}>
          {queue.config.classes.map(gameClass => (
            <GameClassSkillInput
              gameClass={gameClass.name}
              name={`skill.${gameClass.name}`}
              value={player.skill?.[gameClass.name] ?? defaultSkill[gameClass.name] ?? 0}
            >
              <SkillLastUpdated className={gameClass.name} skillHistory={player.skillHistory} />
            </GameClassSkillInput>
          ))}

          <div class={['skill-buttons', queue.config.classes.length > 4 && 'compact']}>
            <button type="submit" class="button button--accent" title="Save">
              <IconDeviceFloppy size={20} />
              <span>Save</span>
            </button>

            <button
              type="button"
              class="button"
              title="Reset"
              hx-get={`/players/${player.steamId}/edit/skill/default`}
              hx-trigger="click"
              hx-disabled-elt="this"
              hx-swap="none"
            >
              <IconInputX size={20} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div class="mx-2" style="grid-area: winLoss">
          <WinLossChart steamId={props.player.steamId} />
        </div>

        <a
          href={`/players/${player.steamId}/edit`}
          class={[
            'button button--accent self-center whitespace-nowrap',
            queue.config.classes.length > 4 && 'compact',
          ]}
          style="grid-area: linkEdit"
          title="Edit player"
        >
          <IconEdit />
          <span>Edit player</span>
        </a>
      </form>
    </div>
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

async function SkillLastUpdated(props: {
  className: Tf2ClassName
  skillHistory: PlayerModel['skillHistory']
}) {
  const skillHistory = props.skillHistory
  if (!skillHistory) {
    return <></>
  }

  const { lastEdit, previousValue } = pluckLastEdit(skillHistory, props.className)
  if (previousValue === 'unknown') {
    return <></>
  }

  const admin = await players.bySteamId(lastEdit.actor, ['name'])
  return (
    <div class="tooltip">
      <p class="text-nowrap">
        Last updated by <strong safe>{admin.name}</strong>{' '}
        {formatDistanceToNow(lastEdit.at, { addSuffix: true }) as 'safe'}
      </p>
      <p class="text-nowrap">
        <strong>{previousValue}</strong> → <strong>{lastEdit.skill[props.className]}</strong>
      </p>
    </div>
  )
}
