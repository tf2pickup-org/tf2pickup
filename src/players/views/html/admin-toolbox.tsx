import { playerGamemodes } from '../../player-gamemodes'
import type { Gamemode } from '../../../shared/types/gamemode'
import { queues } from '../../../queues'
import { gamemodeConfigs } from '../../../gamemodes/configs'
import { configuration } from '../../../configuration'
import type { PlayerBan, PlayerModel, PlayerSkill } from '../../../database/models/player.model'
import {
  IconBan,
  IconCheck,
  IconChevronRight,
  IconClover,
  IconDeviceFloppy,
  IconEdit,
  IconInputX,
} from '../../../html/components/icons'
import { WinLossChart } from './win-loss-chart'
import { GameClassSkillInput } from '../../../html/components/game-class-skill-input'
import { players } from '../..'
import { format, formatDistanceToNow } from 'date-fns'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { pluckLastEdit } from '../../pluck-last-edit'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { makeSkillSuggestions } from '../../make-skill-suggestions'
import { PlayerVerifiedCheckbox } from './player-verified-checkbox'

export async function AdminToolbox(props: {
  player: Pick<
    PlayerModel,
    'skill' | 'steamId' | 'skillHistory' | 'verified' | 'bans' | 'elo' | 'stats'
  >
}) {
  const { player } = props
  const gamemodes = await playerGamemodes(player)
  const defaultSkill = await configuration.get('games.default_player_skill')
  const skillStep = await configuration.get('games.skill_step')
  const requireVerification = await queues.anyRequiresVerification()
  const suggestionsEnabled = await configuration.get('games.skill_suggestions')
  const compact = gamemodes.some(gamemode => gamemodeConfigs[gamemode].classes.length > 4)

  return (
    <details
      id="player-admin-toolbox"
      class="admin-toolbox-details"
      data-details-persist="admin-toolbox"
    >
      <summary class="admin-toolbox-summary">
        <IconChevronRight size={14} class="admin-toolbox-chevron" />
        <span>Admin toolbox</span>
      </summary>
      <script>
        {
          `try{if(localStorage.getItem('details-persist-admin-toolbox')==='open'){document.currentScript.closest('details').setAttribute('open','');}}catch(e){}` as 'safe'
        }
      </script>

      <div class="player-admin-toolbox">
        <div class="admin-toolbox-header">
          {requireVerification && <PlayerVerifiedCheckbox player={player} />}
          <BanStatus bans={player.bans} steamId={player.steamId} />
          <a
            href={`/admin/activity-log?player=${player.steamId}`}
            class="shrink-0 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Activity log
          </a>
          <a
            href={`/players/${player.steamId}/edit`}
            class={['button shrink-0', compact && 'compact']}
            data-variant="accent"
            title="Edit player"
          >
            <IconEdit />
            <span>Edit player</span>
          </a>
        </div>

        <div class="admin-toolbox-divider" />

        <div class={['admin-toolbox-body', compact && 'compact']}>
          <div class="admin-toolbox-skill">
            {gamemodes.map(gamemode => (
              <SkillForm
                player={player}
                gamemode={gamemode}
                labelled={gamemodes.length > 1}
                defaultSkill={defaultSkill[gamemode] ?? {}}
                skillStep={skillStep}
                suggestions={
                  suggestionsEnabled ? makeSkillSuggestions({ player, gamemode }) : undefined
                }
                compact={compact}
              />
            ))}
          </div>

          <div class="admin-toolbox-sep" />

          <div class="admin-toolbox-winloss">
            <h4 class="caption">Win-loss chart</h4>
            <WinLossChart steamId={player.steamId} />
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
  compact: boolean
}) {
  const { player, gamemode } = props
  const skillHistory = player.skillHistory?.filter(entry => entry.gamemode === gamemode)
  return (
    <>
      {player.skill?.[gamemode] === undefined && (
        <div class="flex items-center gap-2 rounded-md bg-green-800/30 px-3 py-2 text-sm text-green-400">
          <IconClover size={16} />
          <span>This player has no {props.labelled ? `${gamemode} ` : ''}skill assigned</span>
        </div>
      )}
      <h4 class="caption">{props.labelled ? `Skill (${gamemode})` : 'Skill'}</h4>
      <form method="post" action={`/players/${player.steamId}/edit/skill`}>
        <input type="hidden" name="gamemode" value={gamemode} />
        <div class={['skill-inputs', props.compact && 'compact']}>
          {gamemodeConfigs[gamemode].classes.map(gameClass => (
            <GameClassSkillInput
              gameClass={gameClass.name}
              id={`playerSkill-${gamemode}-${gameClass.name}`}
              label={
                props.labelled
                  ? `Player's ${gamemode} skill on ${gameClass.name}`
                  : `Player's skill on ${gameClass.name}`
              }
              name={`skill.${gameClass.name}`}
              value={
                player.skill?.[gamemode]?.[gameClass.name] ??
                props.defaultSkill[gameClass.name] ??
                0
              }
              step={props.skillStep}
            >
              <SkillLastUpdated className={gameClass.name} skillHistory={skillHistory} />
              <SkillSuggestionIndicator direction={props.suggestions?.get(gameClass.name)} />
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
              hx-params="none"
              hx-confirm={`Are you sure you want to reset this player's ${gamemode} skill?`}
              hx-trigger="click"
              hx-disabled-elt="this"
              hx-target="#player-admin-toolbox"
              hx-swap="outerHTML"
            >
              <IconInputX size={20} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </form>
    </>
  )
}

function BanStatus(props: { bans: PlayerBan[] | undefined; steamId: SteamId64 }) {
  const now = new Date()
  const activeBan = props.bans
    ?.filter(ban => ban.end > now)
    .sort((a, b) => b.end.getTime() - a.end.getTime())[0]

  if (activeBan) {
    return (
      <div class="flex min-w-0 flex-1 items-center gap-3 rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-300">
        <IconBan size={16} class="shrink-0" />
        <div class="flex min-w-0 flex-col">
          <span>
            Banned until <strong safe>{format(activeBan.end, 'MMM dd, yyyy, HH:mm')}</strong>
          </span>
          <span class="truncate text-red-300/70" safe>
            {activeBan.reason}
          </span>
        </div>
        <a
          href={`/players/${props.steamId}/edit/bans`}
          class="ml-auto shrink-0 text-xs text-red-300 underline hover:text-red-200"
        >
          Manage bans
        </a>
      </div>
    )
  }

  return (
    <div class="bg-zinc-850 flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400">
      <IconCheck size={16} class="shrink-0" />
      <span>No active ban</span>
      <a
        href={`/players/${props.steamId}/edit/bans`}
        class="ml-auto text-xs text-zinc-400 underline hover:text-zinc-200"
      >
        Manage bans
      </a>
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
      class={['pr-2 text-sm', isUp ? 'text-yellow-500/60' : 'text-orange-500/60']}
      title={isUp ? 'Skill too low' : 'Skill too high'}
    >
      {(isUp ? '↑' : '↓') as 'safe'}
    </span>
  )
}
