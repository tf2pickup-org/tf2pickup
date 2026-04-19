import { configuration } from '../../../configuration'
import type { PlayerBan, PlayerModel } from '../../../database/models/player.model'
import {
  IconBan,
  IconCheck,
  IconChevronRight,
  IconClover,
  IconDeviceFloppy,
  IconEdit,
  IconInputX,
} from '../../../html/components/icons'
import { queue } from '../../../queue'
import { WinLossChart } from './win-loss-chart'
import { GameClassSkillInput } from '../../../html/components/game-class-skill-input'
import { players } from '../..'
import { format, formatDistanceToNow } from 'date-fns'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { pluckLastEdit } from '../../pluck-last-edit'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function AdminToolbox(props: {
  player: Pick<PlayerModel, 'skill' | 'steamId' | 'skillHistory' | 'verified' | 'bans'>
}) {
  const { player } = props
  const defaultSkill = await configuration.get('games.default_player_skill')
  const requireVerification = await configuration.get('queue.require_player_verification')
  const compact = queue.config.classes.length > 4

  return (
    <details id="player-admin-toolbox" class="admin-toolbox-details" data-details-persist="admin-toolbox">
      <summary class="admin-toolbox-summary">
        <IconChevronRight size={14} class="admin-toolbox-chevron" />
        <span>Admin toolbox</span>
      </summary>
      <script>{`try{if(localStorage.getItem('details-persist-admin-toolbox')==='open'){document.currentScript.closest('details').setAttribute('open','');}}catch(e){}` as 'safe'}</script>

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

      <div class="player-admin-toolbox">
        <div class="admin-toolbox-header">
          <BanStatus bans={player.bans} steamId={player.steamId} />
          <a
            href={`/players/${player.steamId}/edit`}
            class={['button button--accent shrink-0', compact && 'compact']}
            title="Edit player"
          >
            <IconEdit />
            <span>Edit player</span>
          </a>
        </div>

        <div class="admin-toolbox-divider" />

        <div class="admin-toolbox-body">
          <div class="admin-toolbox-skill">
            {player.skill === undefined && (
              <div class="flex items-center gap-2 rounded-md bg-green-800/30 px-3 py-2 text-sm text-green-400">
                <IconClover size={16} />
                <span>This player has no skill assigned</span>
              </div>
            )}
            <h4 class="caption">Skill</h4>
            <form method="post" action={`/players/${player.steamId}/edit/skill`}>
              <div class={['skill-inputs', compact && 'compact']}>
                {queue.config.classes.map(gameClass => (
                  <GameClassSkillInput
                    gameClass={gameClass.name}
                    name={`skill.${gameClass.name}`}
                    value={player.skill?.[gameClass.name] ?? defaultSkill[gameClass.name] ?? 0}
                  >
                    <SkillLastUpdated
                      className={gameClass.name}
                      skillHistory={player.skillHistory}
                    />
                  </GameClassSkillInput>
                ))}

                <div class={['skill-buttons', compact && 'compact']}>
                  <button type="submit" class="button button--accent" title="Save">
                    <IconDeviceFloppy size={20} />
                    <span>Save</span>
                  </button>

                  <button
                    type="button"
                    class="button"
                    title="Reset"
                    hx-delete={`/players/${player.steamId}/edit/skill`}
                    hx-confirm="Are you sure you want to reset this player's skill?"
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
            Banned until{' '}
            <strong safe>{format(activeBan.end, 'MMM dd, yyyy, HH:mm')}</strong>
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
    <div class="flex flex-1 items-center gap-3 rounded-md bg-abru-light-5 px-3 py-2 text-sm text-abru-light-50">
      <IconCheck size={16} class="shrink-0" />
      <span>No active ban</span>
      <a
        href={`/players/${props.steamId}/edit/bans`}
        class="ml-auto text-xs text-abru-light-50 underline hover:text-abru-light-75"
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
        <strong>{previousValue}</strong> → <strong safe>{lastEdit.skill[props.className]}</strong>
      </p>
    </div>
  )
}
