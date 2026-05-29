import { collections } from '../../../database/collections'
import type { DraftModel } from '../../../database/models/draft.model'
import type { PlayerModel } from '../../../database/models/player.model'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { IconCrown, IconFlag, IconMap } from '../../../html/components/icons'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import type { QueueConfig } from '../../../queue/types/queue-config'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { Tf2Team } from '../../../shared/types/tf2-team'
import { getPickOrder } from '../../get-pick-order'
import { environment } from '../../../environment'
import { queueConfigs } from '../../../queue-auto/configs'

export async function DraftBoard(props: { actor?: SteamId64 | undefined }) {
  const draft = await collections.captainDraft.findOne({})
  if (!draft) return <div id="draft-board" />

  const config = queueConfigs[environment.QUEUE_CONFIG]
  const pickOrder = getPickOrder(config)
  const isPickingDone = draft.picks.length >= pickOrder.length
  const isMapBanPhase = isPickingDone && !draft.selectedMap

  return (
    <div id="draft-board" class="draft-board">
      <div class="draft-teams">
        <TeamColumn
          team={Tf2Team.blu}
          captainId={draft.captains.blu}
          picks={draft.picks.filter(p => p.team === Tf2Team.blu)}
          config={config}
          actor={props.actor}
          currentTurn={draft.currentTurn}
          isPickingDone={isPickingDone}
        />
        <TeamColumn
          team={Tf2Team.red}
          captainId={draft.captains.red}
          picks={draft.picks.filter(p => p.team === Tf2Team.red)}
          config={config}
          actor={props.actor}
          currentTurn={draft.currentTurn}
          isPickingDone={isPickingDone}
        />
      </div>

      {!isPickingDone && (
        <>
          <PickOrderTracker pickOrder={pickOrder} currentIndex={draft.picks.length} />
          <PlayerPool
            draft={draft}
            config={config}
            actor={props.actor}
            currentTurn={draft.currentTurn}
          />
        </>
      )}

      {isMapBanPhase && (
        <MapBanPanel
          mapOptions={draft.mapOptions}
          mapBans={draft.mapBans}
          captains={draft.captains}
          currentTurn={draft.currentTurn}
          actor={props.actor}
        />
      )}

      {(draft.selectedMap ? await SelectedMap({ map: draft.selectedMap }) : '') as 'safe'}
    </div>
  )
}

async function TeamColumn(props: {
  team: Tf2Team
  captainId: SteamId64
  picks: { player: SteamId64; gameClass: Tf2ClassName; team: Tf2Team }[]
  config: QueueConfig
  actor?: SteamId64 | undefined
  currentTurn: Tf2Team
  isPickingDone: boolean
}) {
  const captain = await collections.players.findOne<
    Pick<PlayerModel, 'steamId' | 'name' | 'avatar'>
  >({ steamId: props.captainId }, { projection: { steamId: 1, name: 1, avatar: 1 } })

  const isMyTurn =
    props.actor === props.captainId && props.currentTurn === props.team && !props.isPickingDone
  const teamLabel = props.team === Tf2Team.blu ? 'BLU' : 'RED'
  const teamClass = props.team === Tf2Team.blu ? 'team-blu' : 'team-red'

  return (
    <div class={['draft-team-column', teamClass]}>
      <div class="draft-team-header">
        <span class="team-label">{teamLabel as 'safe'}</span>
        {!!captain && (
          <div class="captain-info">
            <IconCrown size={14} />
            <img src={captain.avatar.medium} width="24" height="24" alt={captain.name} />
            <span safe>{captain.name}</span>
          </div>
        )}
        {isMyTurn && <span class="your-turn-badge">Your turn</span>}
      </div>

      <div class="draft-team-slots">
        {props.config.classes.map(cls => {
          const classPicks = props.picks.filter(p => p.gameClass === cls.name)
          return (
            <div class="draft-class-row">
              <GameClassIcon gameClass={cls.name} size={20} />
              <div class="draft-class-picks">
                {Array.from({ length: cls.count }, (_, i) => {
                  const pick = classPicks[i]
                  return pick ? (
                    <PickedPlayer steamId={pick.player} />
                  ) : (
                    <div class="empty-pick-slot" />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

async function PickedPlayer(props: { steamId: SteamId64 }) {
  const player = await collections.players.findOne<Pick<PlayerModel, 'name' | 'avatar'>>(
    { steamId: props.steamId },
    { projection: { name: 1, avatar: 1 } },
  )
  if (!player) return <div class="empty-pick-slot" />
  return (
    <div class="picked-player">
      <img src={player.avatar.medium} width="32" height="32" alt={player.name} />
      <span safe>{player.name}</span>
    </div>
  )
}

function PickOrderTracker(props: { pickOrder: Tf2Team[]; currentIndex: number }) {
  return (
    <div class="pick-order-tracker">
      {props.pickOrder.map((team, i) => (
        <div
          class={[
            'pick-order-dot',
            team === Tf2Team.blu ? 'team-blu' : 'team-red',
            i < props.currentIndex ? 'done' : i === props.currentIndex ? 'active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  )
}

async function PlayerPool(props: {
  draft: DraftModel
  config: QueueConfig
  actor?: SteamId64 | undefined
  currentTurn: Tf2Team
}) {
  const pickedIds = new Set(props.draft.picks.map(p => p.player))
  const captainIds = new Set(Object.values(props.draft.captains))

  const allPlayers = await collections.queuePlayers.find({}).toArray()
  const available = allPlayers.filter(p => !pickedIds.has(p.steamId) && !captainIds.has(p.steamId))

  const isMyCaptainTurn = props.actor === props.draft.captains[props.currentTurn]

  return (
    <div class="player-pool">
      <h4 class="player-pool-header">Available players</h4>
      <div class="player-pool-list">
        {
          (
            await Promise.all(
              available.map(p =>
                PoolPlayer({
                  player: p,
                  config: props.config,
                  isMyCaptainTurn,
                  currentTurn: props.currentTurn,
                }),
              ),
            )
          ).join('') as 'safe'
        }
      </div>
    </div>
  )
}

async function PoolPlayer(props: {
  player: { steamId: SteamId64; offeredClasses: Tf2ClassName[] }
  config: QueueConfig
  isMyCaptainTurn: boolean
  currentTurn: Tf2Team
}) {
  const profile = await collections.players.findOne<Pick<PlayerModel, 'name' | 'avatar'>>(
    { steamId: props.player.steamId },
    { projection: { name: 1, avatar: 1 } },
  )
  if (!profile) return <></>

  return (
    <div class="pool-player">
      <img src={profile.avatar.medium} width="32" height="32" alt={profile.name} />
      <span class="pool-player-name" safe>
        {profile.name}
      </span>
      <div class="pool-player-classes">
        {props.player.offeredClasses.map(cls => (
          <GameClassIcon gameClass={cls} size={18} />
        ))}
      </div>
      {props.isMyCaptainTurn && (
        <div class="pick-buttons">
          {props.player.offeredClasses.map(cls => (
            <button
              class="pick-button"
              name="captainPick"
              value={props.player.steamId}
              ws-send
              hx-vals={JSON.stringify({ gameClass: cls })}
              data-umami-event="captain-pick"
            >
              <GameClassIcon gameClass={cls} size={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MapBanPanel(props: {
  mapOptions: string[]
  mapBans: { captain: SteamId64; team: Tf2Team; map: string }[]
  captains: { blu: SteamId64; red: SteamId64 }
  currentTurn: Tf2Team
  actor?: SteamId64 | undefined
}) {
  const bannedMaps = new Set(props.mapBans.map(b => b.map))
  const isMyTurn = props.actor === props.captains[props.currentTurn]
  const teamLabel = props.currentTurn === Tf2Team.blu ? 'BLU' : 'RED'

  return (
    <div class="map-ban-panel">
      <h4 class="map-ban-header">
        <IconFlag size={18} />
        <span safe>{isMyTurn ? 'Ban a map' : `${teamLabel} is banning a map…`}</span>
      </h4>
      <div class="map-ban-options">
        {props.mapOptions.map(map => {
          const banned = bannedMaps.has(map)
          const banInfo = props.mapBans.find(b => b.map === map)
          return (
            <div class={['map-ban-card', banned ? 'banned' : ''].filter(Boolean).join(' ')}>
              <div class="map-thumbnail-wrapper">
                <MapThumbnail map={map} />
              </div>
              <span class="map-name" safe>
                {map}
              </span>
              {banned && !!banInfo && (
                <span class="ban-label">
                  {(banInfo.team === Tf2Team.blu ? 'BLU' : 'RED') as 'safe'} banned
                </span>
              )}
              {!banned && isMyTurn && (
                <button
                  class="ban-button"
                  name="captainBanMap"
                  value={map}
                  ws-send
                  data-umami-event="captain-ban-map"
                  data-umami-event-map={map}
                >
                  Ban
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SelectedMap(props: { map: string }) {
  return (
    <div class="selected-map">
      <IconMap size={20} />
      <span>Playing on</span>
      <span class="selected-map-name" safe>
        {props.map}
      </span>
      <div class="selected-map-thumbnail">
        <MapThumbnail map={props.map} />
      </div>
    </div>
  )
}
