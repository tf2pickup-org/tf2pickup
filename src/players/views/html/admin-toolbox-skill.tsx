import { formatDistanceToNow } from 'date-fns'
import { configuration } from '../../../configuration'
import type { PlayerModel } from '../../../database/models/player.model'
import { GameClassSkillInput } from '../../../html/components/game-class-skill-input'
import { GamemodeTabs } from '../../../html/components/gamemode-tabs'
import { IconClover, IconDeviceFloppy, IconInputX } from '../../../html/components/icons'
import { getQueueConfig } from '../../../queue-auto/configs'
import { enabledGamemodes } from '../../../shared/enabled-gamemodes'
import { gamemodeDisplayName } from '../../../shared/gamemode-display-name'
import type { Gamemode } from '../../../shared/types/gamemode'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { players } from '../..'
import { makeSkillSuggestions } from '../../make-skill-suggestions'
import { pluckLastEdit } from '../../pluck-last-edit'

/**
 * The per-gamemode skill editor inside the admin toolbox. Swapped in place
 * by the gamemode tabs (GET /players/:steamId/edit/skill?gamemode=...).
 */
export async function AdminToolboxSkill(props: {
  player: Pick<PlayerModel, 'skill' | 'steamId' | 'skillHistory' | 'elo' | 'stats'>
  gamemode: Gamemode
}) {
  const { player, gamemode } = props
  const defaultSkill = await configuration.get('games.default_player_skill', gamemode)
  const skillStep = await configuration.get('games.skill_step')
  const skillSuggestions = (await configuration.get('games.skill_suggestions'))
    ? makeSkillSuggestions({ player, gamemode })
    : undefined
  const classes = getQueueConfig(gamemode).classes
  const compact = classes.length > 4

  return (
    <div class="admin-toolbox-skill" id="admin-toolbox-skill">
      {player.skill?.[gamemode] === undefined && (
        <div class="flex items-center gap-2 rounded-md bg-green-800/30 px-3 py-2 text-sm text-green-400">
          <IconClover size={16} />
          <span>This player has no skill assigned</span>
        </div>
      )}
      <h4 class="caption">Skill</h4>
      {enabledGamemodes.length > 1 && (
        <div class="flex flex-row flex-wrap items-center justify-between gap-2">
          <span class="text-abru-light-75 text-sm">
            Editing for <strong safe>{gamemodeDisplayName(gamemode)}</strong>
          </span>
          <GamemodeTabs
            active={gamemode}
            fragment
            hxTarget="#admin-toolbox-skill"
            hrefFn={tab => `/players/${player.steamId}/edit/skill?gamemode=${tab}`}
          />
        </div>
      )}
      <form method="post" action={`/players/${player.steamId}/edit/skill?gamemode=${gamemode}`}>
        <div class={['skill-inputs', compact && 'compact']}>
          {classes.map(gameClass => (
            <GameClassSkillInput
              gameClass={gameClass.name}
              name={`skill.${gameClass.name}`}
              value={
                player.skill?.[gamemode]?.[gameClass.name] ?? defaultSkill[gameClass.name] ?? 0
              }
              step={skillStep}
            >
              <SkillLastUpdated
                className={gameClass.name}
                skillHistory={player.skillHistory}
                gamemode={gamemode}
              />
              <SkillSuggestionIndicator direction={skillSuggestions?.get(gameClass.name)} />
            </GameClassSkillInput>
          ))}

          <div class="skill-buttons">
            <button
              type="submit"
              class="button"
              data-variant="accent"
              title="Save"
              data-umami-event="save-player-skill"
              data-umami-event-player={player.steamId}
            >
              <IconDeviceFloppy size={20} />
              <span>Save</span>
            </button>

            <button
              type="button"
              class="button"
              title="Reset"
              data-umami-event="reset-player-skill"
              data-umami-event-player={player.steamId}
              hx-delete={`/players/${player.steamId}/edit/skill?gamemode=${gamemode}`}
              hx-confirm="Are you sure you want to reset this player's skill?"
              hx-trigger="click"
              hx-disabled-elt="this"
              hx-target="#admin-toolbox-skill"
              hx-swap="outerHTML"
            >
              <IconInputX size={20} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

async function SkillLastUpdated(props: {
  className: Tf2ClassName
  skillHistory: PlayerModel['skillHistory']
  gamemode: Gamemode
}) {
  const skillHistory = props.skillHistory
  if (!skillHistory) {
    return <></>
  }

  const edit = pluckLastEdit(skillHistory, props.className, props.gamemode)
  if (!edit || edit.previousValue === 'unknown') {
    return <></>
  }
  const { lastEdit, previousValue } = edit

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

function SkillSuggestionIndicator(props: { direction: 'up' | 'down' | undefined }) {
  if (props.direction === undefined) return <></>
  const isUp = props.direction === 'up'
  return (
    <span
      class={['pr-2 text-sm', isUp ? 'text-yellow-500/60' : 'text-orange-500/60']}
      title={isUp ? 'Skill too low' : 'Skill too high'}
    >
      {(isUp ? '↑' : '↓') as 'safe'}
    </span>
  )
}
