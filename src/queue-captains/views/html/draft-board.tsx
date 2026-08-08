import { GameClassIcon } from '../../../html/components/game-class-icon'
import { IconCrown, IconLock } from '../../../html/components/icons'
import { DraftState, type DraftModel } from '../../../database/models/draft.model'
import { config } from '../../../queue-auto/config'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { Tf2Team } from '../../../shared/types/tf2-team'
import { currentTurn } from '../../draft/current-turn'
import { getCurrent } from '../../draft/get-current'
import { openSlots } from '../../draft/open-slots'
import { remainingCandidates } from '../../draft/remaining-candidates'
import { legalPicks, type LegalPick } from '../../matching/legal-picks'
import { MapBans } from './map-bans'
import { pickOrder } from '../../pick-order'
import { teamSlots } from '../../team-slots'

export async function DraftBoard(props: { actor?: SteamId64 | undefined }) {
  const draft = await getCurrent()
  if (!draft) {
    return <div id="draft-board"></div>
  }

  const banning = draft.state === DraftState.banningMaps
  const turn = banning ? null : currentTurn(draft, config)
  const isMyTurn = turn !== null && draft.captains[turn.team] === props.actor
  const available = openSlots(draft, config)
  const picks =
    turn === null
      ? []
      : legalPicks({
          openSlots: available,
          candidates: remainingCandidates(draft),
          team: turn.team,
        })

  const teamSize = teamSlots(config).length / 2

  return (
    <div id="draft-board" class="draft-board" data-large-roster={`${teamSize > 6}`}>
      {banning ? (
        <div class="captains-panel turn-bar">
          <div class="turn-bar-top">
            <div class="turn-who">
              <MapBans.heading draft={draft} actor={props.actor} />
            </div>
            <span class="turn-clock" data-countdown={banClockMs(draft)} safe>
              {formatClock(banClockMs(draft))}
            </span>
          </div>
          <div class="turn-timer">
            <i style={`animation-duration: ${banClockMs(draft)}ms`}></i>
          </div>
        </div>
      ) : (
        <TurnBar draft={draft} turn={turn} isMyTurn={isMyTurn} />
      )}

      <div class="draft-teams">
        {[Tf2Team.blu, Tf2Team.red].map(team => (
          <TeamPanel draft={draft} team={team} active={turn?.team === team} />
        ))}
      </div>

      {banning && <MapBans draft={draft} actor={props.actor} />}

      {turn !== null && (
        <AvailablePool
          draft={draft}
          picks={picks}
          isMyTurn={isMyTurn}
          slotsLeft={available.length}
        />
      )}
    </div>
  )
}

function TurnBar(props: {
  draft: DraftModel
  turn: { index: number; team: Tf2Team; total: number } | null
  isMyTurn: boolean
}) {
  const { draft, turn } = props
  if (turn === null) {
    return (
      <div class="captains-panel turn-bar" data-team="done">
        <div class="turn-bar-top">
          <span class="turn-label">Teams are set</span>
        </div>
      </div>
    )
  }

  const order = pickOrder(config)
  const remainingMs = Math.max((draft.turnEndsAt?.getTime() ?? 0) - Date.now(), 0)
  const captain = draft.pool.find(entry => entry.steamId === draft.captains[turn.team])

  return (
    <div class="captains-panel turn-bar" data-team={turn.team}>
      <div class="turn-bar-top">
        <div class="turn-who">
          <span class="turn-team" data-team={turn.team}>
            {turn.team}
          </span>
          <span class="turn-label">{props.isMyTurn ? 'Your pick' : 'is picking'}</span>
          <span class="turn-sub">
            {!props.isMyTurn && <span safe>{captain?.name ?? 'captain'} · </span>}
            pick {turn.index + 1} of {turn.total}
            {props.isMyTurn && ' · choose a player and the class they will play'}
          </span>
        </div>
        <span class="turn-clock" data-countdown={remainingMs} safe>
          {formatClock(remainingMs)}
        </span>
      </div>

      <div class="turn-order" aria-hidden="true">
        {order.map((team, index) => (
          <i
            data-team={team}
            data-state={index < turn.index ? 'done' : index === turn.index ? 'now' : 'next'}
          ></i>
        ))}
      </div>

      <div class="turn-timer">
        <i style={`animation-duration: ${remainingMs}ms`}></i>
      </div>
    </div>
  )
}

function TeamPanel(props: { draft: DraftModel; team: Tf2Team; active: boolean }) {
  const { draft, team } = props
  const captainId = draft.captains[team]
  const captain = draft.pool.find(entry => entry.steamId === captainId)
  const picked = draft.picks.filter(pick => pick.team === team)

  const remaining = teamSlots(config).filter(slot => slot.team === team)
  for (const pick of picked) {
    const index = remaining.findIndex(slot => slot.gameClass === pick.gameClass)
    if (index >= 0) {
      remaining.splice(index, 1)
    }
  }

  // One of the remaining slots is the captain's. It has to be one they can actually play, so a
  // class they cannot play always stays on the board as an open pick.
  const captainClasses = [...new Set(remaining.map(slot => slot.gameClass))].filter(gameClass =>
    captain?.gameClasses.includes(gameClass),
  )
  const captainSlot = remaining.findIndex(slot => captainClasses.includes(slot.gameClass))
  const openSlots = remaining.filter((_, index) => index !== captainSlot)

  return (
    <div class="draft-team" data-team={team} data-active={`${props.active}`}>
      <div class="draft-team-head">
        <span>{team}</span>
        <span class="draft-team-captain">
          <IconCrown size={14} />
          <span safe>{captain?.name ?? '—'}</span>
        </span>
      </div>

      <div class="draft-team-rows">
        {picked.map(pick => {
          const player = draft.pool.find(entry => entry.steamId === pick.player)
          return (
            <div class="draft-row" data-auto={`${Boolean(pick.auto)}`}>
              <GameClassIcon gameClass={pick.gameClass} size={22} />
              <img src={player?.avatarUrl} width="32" height="32" alt="" loading="lazy" />
              <span class="draft-name" safe>
                {player?.name ?? 'unknown'}
              </span>
              {!!pick.auto && <span class="draft-flag">auto</span>}
              {!!pick.forced && <span class="draft-flag">forced</span>}
            </div>
          )
        })}

        <div class="draft-row">
          <span class="draft-captain-classes">
            {captainClasses.map(gameClass => (
              <GameClassIcon gameClass={gameClass} size={22} />
            ))}
          </span>
          <img src={captain?.avatarUrl} width="32" height="32" alt="" loading="lazy" />
          <span class="draft-name" safe>
            {captain?.name ?? '—'}
          </span>
          <span class="draft-flag">{captainClasses.length === 1 ? 'locked in' : 'class TBD'}</span>
        </div>

        {openSlots.map(slot => (
          <div class="draft-row draft-row-open">
            <GameClassIcon gameClass={slot.gameClass} size={22} />
            <span class="draft-open-label">open</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AvailablePool(props: {
  draft: DraftModel
  picks: LegalPick[]
  isMyTurn: boolean
  slotsLeft: number
}) {
  const { draft } = props
  const pickedIds = new Set(draft.picks.map(pick => pick.player))
  const captainIds = new Set(Object.values(draft.captains))
  const available = draft.pool.filter(
    entry => !pickedIds.has(entry.steamId) && !captainIds.has(entry.steamId),
  )
  const sittingOut = available.length - (props.slotsLeft - 2)

  return (
    <div class="draft-available">
      <div class="draft-available-head">
        <span class="captains-panel-label">Available · {available.length}</span>
        {sittingOut > 0 && (
          <span class="draft-available-note" safe>
            {sittingOut === 1 ? 'One of these will' : `${sittingOut} of these will`} not play this
            game
          </span>
        )}
        <div class="draft-rule"></div>
      </div>

      <form class="draft-available-grid" ws-send data-disable-when-offline>
        {available.map(entry => {
          const options = entry.gameClasses.map(gameClass => ({
            gameClass,
            legal: props.picks.some(
              pick => pick.steamId === entry.steamId && pick.gameClass === gameClass,
            ),
          }))
          const anyLegal = options.some(option => option.legal)

          return (
            <div class="draft-card" data-locked={`${!anyLegal}`}>
              <div class="draft-card-top">
                <img src={entry.avatarUrl} width="40" height="40" alt="" loading="lazy" />
                <span class="draft-name" safe>
                  {entry.name}
                </span>
              </div>
              <div class="draft-card-picks">
                {options.map(({ gameClass, legal }) =>
                  legal && props.isMyTurn ? (
                    <button
                      class="draft-pick"
                      name="captainspick"
                      value={`${entry.steamId}:${gameClass}`}
                      data-umami-event="captains-draft-pick"
                      data-umami-event-class={gameClass}
                    >
                      <GameClassIcon gameClass={gameClass} size={20} />
                      <span>{gameClass}</span>
                    </button>
                  ) : (
                    <span class="draft-pick" data-locked={`${!legal}`}>
                      {!legal && <IconLock size={13} />}
                      <GameClassIcon gameClass={gameClass} size={20} />
                      <span>{gameClass}</span>
                    </span>
                  ),
                )}
              </div>
            </div>
          )
        })}
      </form>
    </div>
  )
}

function banClockMs(draft: DraftModel): number {
  return Math.max((draft.turnEndsAt?.getTime() ?? 0) - Date.now(), 0)
}

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}
