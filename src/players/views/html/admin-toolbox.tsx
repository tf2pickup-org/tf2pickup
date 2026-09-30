import { playerGamemodes } from '../../player-gamemodes'
import type { Gamemode } from '../../../shared/types/gamemode'
import { queues } from '../../../queues'
import { gamemodeConfigs } from '../../../gamemodes/configs'
import { configuration } from '../../../configuration'
import type { PlayerBan, PlayerModel, PlayerSkill } from '../../../database/models/player.model'
import {
  IconArrowUpRight,
  IconBan,
  IconChevronDown,
  IconClover,
  IconMessageCircleOff,
} from '../../../html/components/icons'
import { GameClassSkillInput } from '../../../html/components/game-class-skill-input'
import { players } from '../..'
import { format, formatDistanceToNow } from 'date-fns'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { pluckLastEdit } from '../../pluck-last-edit'
import { makeSkillSuggestions } from '../../make-skill-suggestions'
import { effectiveSkill } from '../../effective-skill'
import { PlayerVerifiedCheckbox } from './player-verified-checkbox'

export async function AdminToolbox(props: {
  player: Pick<
    PlayerModel,
    'skill' | 'steamId' | 'skillHistory' | 'verified' | 'bans' | 'chatMutes' | 'elo' | 'stats'
  >
}) {
  const { player } = props
  const gamemodes = (await playerGamemodes(player)).filter(
    gamemode => gamemodeConfigs[gamemode].autoBalance,
  )
  const defaultSkill = await configuration.get('games.default_player_skill')
  const skillStep = await configuration.get('games.skill_step')
  const requireVerification = await queues.anyRequiresVerification()
  const suggestionsEnabled = await configuration.get('games.skill_suggestions')

  return (
    <details id="player-admin-toolbox" class="admin-area" data-details-persist="admin-toolbox">
      <summary class="admin-area-summary">
        <span>Admin area</span>
        <IconChevronDown class="admin-area-chevron" />
      </summary>
      <script>
        {
          `try{if(localStorage.getItem('details-persist-admin-toolbox')==='open'){document.currentScript.closest('details').setAttribute('open','');}}catch(e){}` as 'safe'
        }
      </script>

      <div class="player-admin-toolbox">
        {requireVerification && <PlayerVerifiedCheckbox player={player} />}

        {gamemodes.length > 0 && (
          <>
            <h4 class="admin-area-caption">Skill adjustment</h4>
            {gamemodes.length > 1 && (
              <div class="admin-area-switch" data-tabs data-tabs-persist="admin-skill-gamemode">
                {gamemodes.map(gamemode => (
                  <button type="button" data-tabs-select={`admin-skill-${gamemode}`}>
                    {gamemode}
                  </button>
                ))}
              </div>
            )}
            {gamemodes.map(gamemode => (
              <div id={`admin-skill-${gamemode}`} class="admin-area-skill">
                <SkillForm
                  player={player}
                  gamemode={gamemode}
                  labelled={gamemodes.length > 1}
                  defaultSkill={defaultSkill[gamemode] ?? {}}
                  skillStep={skillStep}
                  suggestions={
                    suggestionsEnabled ? makeSkillSuggestions({ player, gamemode }) : undefined
                  }
                />
              </div>
            ))}
          </>
        )}

        <h4 class="admin-area-caption">Moderation</h4>
        <Restrictions player={player} />

        <div class="admin-area-footer">
          <a href={`/players/${player.steamId}/edit/bans/add`} class="button" data-variant="accent">
            Add ban
          </a>
          <div class="admin-area-links">
            <a href={`/players/${player.steamId}/edit`}>
              Edit player
              <IconArrowUpRight size={12} />
            </a>
            <a href={`/admin/activity-log?player=${player.steamId}`}>
              Activity log
              <IconArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </div>
    </details>
  )
}

async function SkillForm(props: {
  player: Pick<PlayerModel, 'steamId' | 'skill' | 'skillHistory'>
  gamemode: Gamemode
  // name the gamemode when there's more than one form
  labelled: boolean
  defaultSkill: PlayerSkill
  skillStep: number
  suggestions: Map<Tf2ClassName, 'up' | 'down'> | undefined
}) {
  const { player, gamemode } = props
  const skillHistory = player.skillHistory?.filter(entry => entry.gamemode === gamemode)
  const classes = gamemodeConfigs[gamemode].classes
  return (
    <>
      {player.skill?.[gamemode] === undefined && (
        <div class="flex items-center gap-2 rounded-md bg-green-800/30 px-3 py-2 text-sm text-green-400">
          <IconClover size={16} />
          <span>This player has no {props.labelled ? `${gamemode} ` : ''}skill assigned</span>
        </div>
      )}
      <form method="post" action={`/players/${player.steamId}/edit/skill`} data-skill-form>
        <input type="hidden" name="gamemode" value={gamemode} />
        <div
          class="skill-inputs"
          data-columns={classes.length > 4 ? 3 : classes.length}
          style={`--skill-columns: ${classes.length > 4 ? 3 : classes.length}`}
        >
          {classes.map(gameClass => (
            <GameClassSkillInput
              gameClass={gameClass.name}
              id={`playerSkill-${gamemode}-${gameClass.name}`}
              label={
                props.labelled
                  ? `Player's ${gamemode} skill on ${gameClass.name}`
                  : `Player's skill on ${gameClass.name}`
              }
              name={`skill.${gameClass.name}`}
              value={effectiveSkill(player.skill?.[gamemode], props.defaultSkill, gameClass.name)}
              step={props.skillStep}
            >
              <SkillLastUpdated className={gameClass.name} skillHistory={skillHistory} />
              <SkillSuggestionIndicator direction={props.suggestions?.get(gameClass.name)} />
            </GameClassSkillInput>
          ))}
        </div>

        <div class="skill-buttons">
          <button
            type="submit"
            class="button"
            data-variant="accent"
            data-umami-event="save-player-skill"
            data-umami-event-player={player.steamId}
          >
            Save
          </button>

          <button
            type="button"
            class="button"
            data-umami-event="reset-player-skill"
            data-umami-event-player={player.steamId}
            hx-delete={`/players/${player.steamId}/edit/skill?gamemode=${gamemode}`}
            hx-params="none"
            hx-confirm={`Are you sure you want to reset this player's ${gamemode} skill?`}
            hx-trigger="click"
            hx-disabled-elt="this"
            hx-target="#player-admin-toolbox"
            hx-swap="outerHTML"
          >
            Reset
          </button>

          <span class="skill-unsaved" data-skill-unsaved aria-live="polite"></span>
        </div>
      </form>
    </>
  )
}

// Active bans and chat mutes, latest ending first.
function Restrictions(props: { player: Pick<PlayerModel, 'bans' | 'chatMutes'> }) {
  const now = new Date()
  const active = (restrictions: PlayerBan[] | undefined) =>
    (restrictions ?? [])
      .filter(restriction => restriction.end > now)
      .sort((a, b) => b.end.getTime() - a.end.getTime())
  const bans = active(props.player.bans)
  const chatMutes = active(props.player.chatMutes)

  if (bans.length === 0 && chatMutes.length === 0) {
    return <p class="admin-area-muted">No active bans or chat mutes</p>
  }

  return (
    <div class="admin-area-restrictions">
      {bans.map(ban => (
        <div class="admin-area-restriction" data-kind="ban">
          <IconBan class="shrink-0" />
          <div>
            <strong safe>Banned until {format(ban.end, 'MMM dd, yyyy, HH:mm')}</strong>
            <span safe>{ban.reason}</span>
          </div>
        </div>
      ))}
      {chatMutes.map(mute => (
        <div class="admin-area-restriction" data-kind="chat-mute">
          <IconMessageCircleOff class="shrink-0" />
          <div>
            <strong safe>Chat muted until {format(mute.end, 'MMM dd, yyyy, HH:mm')}</strong>
            <span safe>{mute.reason}</span>
          </div>
        </div>
      ))}
    </div>
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

function SkillSuggestionIndicator(props: { direction: 'up' | 'down' | undefined }) {
  if (props.direction === undefined) return <></>
  const isUp = props.direction === 'up'
  return (
    <span
      class="skill-suggestion"
      data-direction={props.direction}
      title={isUp ? 'Skill too low' : 'Skill too high'}
    >
      {(isUp ? '↑' : '↓') as 'safe'}
    </span>
  )
}
