import { configuration } from '../../../configuration'
import type { PlayerBan, PlayerModel } from '../../../database/models/player.model'
import { IconBan, IconCheck, IconChevronRight, IconEdit } from '../../../html/components/icons'
import { WinLossChart } from './win-loss-chart'
import { format } from 'date-fns'
import { getQueueConfig } from '../../../queue-auto/configs'
import type { Gamemode } from '../../../shared/types/gamemode'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { AdminToolboxSkill } from './admin-toolbox-skill'
import { PlayerVerifiedCheckbox } from './player-verified-checkbox'

export async function AdminToolbox(props: {
  player: Pick<
    PlayerModel,
    'skill' | 'steamId' | 'skillHistory' | 'verified' | 'bans' | 'elo' | 'stats'
  >
  gamemode: Gamemode
}) {
  const { player, gamemode } = props
  const requireVerification = await configuration.get('queue.require_player_verification')
  const compact = getQueueConfig(gamemode).classes.length > 4

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
            class="text-abru-light-50 hover:text-abru-light-75 shrink-0 text-sm"
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

        <div class="admin-toolbox-body">
          <AdminToolboxSkill player={player} gamemode={gamemode} />

          <div class="admin-toolbox-divider" />

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
    <div class="bg-abru-light-5 text-abru-light-50 flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm">
      <IconCheck size={16} class="shrink-0" />
      <span>No active ban</span>
      <a
        href={`/players/${props.steamId}/edit/bans`}
        class="text-abru-light-50 hover:text-abru-light-75 ml-auto text-xs underline"
      >
        Manage bans
      </a>
    </div>
  )
}
