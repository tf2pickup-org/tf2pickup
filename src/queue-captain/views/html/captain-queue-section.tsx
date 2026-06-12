import { collections } from '../../../database/collections'
import { environment } from '../../../environment'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { players } from '../../../players'
import { queueConfigs } from '../../../queue-auto/configs'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { CaptainClassColumn } from './captain-player-slot'

export async function CaptainQueueSection(props: { actor?: SteamId64 | undefined }) {
  const config = queueConfigs[environment.QUEUE_CONFIG]
  const allPlayers = await collections.queuePlayers.find({}).toArray()

  const actorProfile = props.actor
    ? await players.bySteamId(props.actor, ['bans', 'activeGame', 'verified', 'hasAcceptedRules'])
    : undefined

  const eligible = actorProfile
    ? !actorProfile.bans?.some(b => b.end > new Date()) &&
      !actorProfile.activeGame &&
      actorProfile.hasAcceptedRules
    : false

  const gridCols = config.classes.length > 4 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'

  return (
    <form
      id="captain-queue"
      class={['grid grid-cols-1 gap-4 md:grid-cols-2', gridCols]}
      ws-send
      data-disable-when-offline
    >
      {
        (
          await Promise.all(
            config.classes.map(async gc => (
              <div class="flex flex-col gap-4">
                <div class="flex flex-row items-center justify-center gap-2">
                  <GameClassIcon gameClass={gc.name} size={32} />
                  <span class="text-center text-2xl font-bold text-white">{gc.name}</span>
                </div>
                <div class="captain-class-column-wrapper">
                  <CaptainClassColumn
                    gameClass={gc.name}
                    players={allPlayers}
                    actor={eligible ? props.actor : undefined}
                  />
                </div>
              </div>
            )),
          )
        ).join('') as 'safe'
      }
    </form>
  )
}
