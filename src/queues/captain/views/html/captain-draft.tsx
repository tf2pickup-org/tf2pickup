import type { Children } from '@kitajs/html'
import type { QueueModel } from '../../../../database/models/queue.model'
import { QueueState } from '../../../../database/models/queue-state.model'
import { GameClassIcon } from '../../../../html/components/game-class-icon'
import { IconCrown } from '../../../../html/components/icons'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { Tf2Team } from '../../../../shared/types/tf2-team'
import { captainRoles } from '../../captain-roles'
import { draftTurns } from '../../draft-turns'
import { roleKey } from '../../role-key'
import { roleLabel } from '../../role-label'
import type { CaptainRole } from '../../types/captain-role'
import type { DraftView } from '../../types/draft-view'
import type { PoolView } from '../../types/pool-view'
import { banTurn } from '../../ban-turn'
import { CaptainMapBans } from './captain-map-bans'
import { PhaseTimer } from './phase-timer'

type Queue = Pick<QueueModel, 'gamemode'>

interface DraftProps {
  queue: Queue
  view: PoolView
  // who is looking
  viewer?: SteamId64 | undefined
}

const teamName = { [Tf2Team.red]: 'RED', [Tf2Team.blu]: 'BLU' } as const

function columnId(role: CaptainRole) {
  return `captain-draft-role-${role.gameClass}-${role.name}`
}

function nameOf(draft: DraftView, steamId: SteamId64) {
  return draft.members.find(member => member.player.steamId === steamId)?.player.name ?? steamId
}

// The draft: the status line, the teams and the pool being picked from, which is made of the
// locked members. The page swaps in each part on its own, so no single message gets large.
export function CaptainDraft(props: DraftProps) {
  const roles = captainRoles(props.queue.gamemode)
  const { draft } = props.view
  return (
    <CaptainDraftFrame active={!!draft}>
      {draft ? (
        <>
          <CaptainDraftStatus {...props} />
          <CaptainDraftBoard {...props} />
          <CaptainMapBans view={props.view} viewer={props.viewer} />
          <div
            class={[
              'grid grid-cols-2 gap-4 max-lg:order-2 lg:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]',
              props.view.state !== QueueState.drafting && 'hidden',
            ]}
          >
            {roles.map(role => (
              <CaptainDraftRoleColumn {...props} role={role} />
            ))}
          </div>
        </>
      ) : (
        <></>
      )}
    </CaptainDraftFrame>
  )
}

function CaptainDraftFrame(props: { active: boolean; children?: Children }) {
  return (
    <div
      id="captain-draft"
      class="flex flex-col gap-4 empty:hidden"
      data-active={props.active ? '' : undefined}
      data-disable-when-offline
    >
      {props.children}
    </div>
  )
}

// What a live update replaces first: the frame holding the places the parts below go to.
function CaptainDraftSkeleton(props: DraftProps) {
  const roles = captainRoles(props.queue.gamemode)
  return (
    <CaptainDraftFrame active={!!props.view.draft}>
      {props.view.draft ? (
        <>
          <div id="captain-draft-status"></div>
          <div id="captain-draft-board"></div>
          <div id="captain-map-bans"></div>
          <div
            class={[
              'grid grid-cols-2 gap-4 max-lg:order-2 lg:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]',
              props.view.state !== QueueState.drafting && 'hidden',
            ]}
          >
            {roles.map(role => (
              <div id={columnId(role)}></div>
            ))}
          </div>
        </>
      ) : (
        <></>
      )}
    </CaptainDraftFrame>
  )
}

function CaptainDraftStatus(props: DraftProps) {
  const { draft, turn } = props.view.draft!
  if (!turn) {
    const ban = banTurn(draft)
    const text =
      props.view.state === QueueState.launching
        ? 'Game is launching'
        : `${nameOf(props.view.draft!, draft[ban.team])} (${teamName[ban.team]}) bans map ${ban.index + 1}`
    return (
      <div id="captain-draft-status" class="text-sm text-zinc-200">
        {props.view.state === QueueState.launching ? (
          <span class="font-medium" role="status" aria-live="polite" safe>
            {text}
          </span>
        ) : (
          <PhaseTimer startedAt={draft.turnStartedAt} deadline={draft.turnDeadline}>
            <span safe>{text}</span>
          </PhaseTimer>
        )}
      </div>
    )
  }

  const captain = draft[turn.team]
  const picks = turn.remaining.join(' & ')
  const mine = props.viewer === captain
  const first = draft.picks.length === 0
  const text = mine
    ? `Your pick — pick ${picks}`
    : `${nameOf(props.view.draft!, captain)} (${teamName[turn.team]}) is ${
        first ? 'first picking' : `now picking pick ${picks}`
      }`
  return (
    <div id="captain-draft-status">
      <PhaseTimer startedAt={draft.turnStartedAt} deadline={draft.turnDeadline}>
        {mine ? (
          <strong class="font-bold text-zinc-50" safe>
            {text}
          </strong>
        ) : (
          <span safe>{text}</span>
        )}
      </PhaseTimer>
    </div>
  )
}

function CaptainDraftBoard(props: DraftProps) {
  const view = props.view.draft!
  const roles = captainRoles(props.queue.gamemode)
  const turns = draftTurns(roles.length)
  const upcoming = new Set(view.turn?.remaining)
  return (
    <div
      id="captain-draft-board"
      class="grid grid-cols-2 gap-4 max-lg:order-3 lg:grid-cols-1"
      style={`--cols: ${roles.length}`}
    >
      {[Tf2Team.red, Tf2Team.blu].map(team => {
        const numbers = turns.filter(turn => turn.team === team).flatMap(turn => turn.picks)
        const captainRole = view.finalRoles.find(pick => pick.team === team)
        const dark = team === Tf2Team.red ? 'bg-team-red-dark' : 'bg-team-blu-dark'
        const border = team === Tf2Team.red ? 'border-team-red/40' : 'border-team-blu/40'
        const captain = view.draft[team]
        return (
          <div
            class="flex flex-col gap-2 lg:grid lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))] lg:gap-4"
            aria-label={`${teamName[team]} team`}
          >
            <div
              class={[
                'flex min-h-[60px] flex-col justify-center rounded-lg border px-3 py-2',
                dark,
                border,
              ]}
            >
              {captainRole ? (
                <span class="flex items-center gap-1 text-sm font-bold text-zinc-400">
                  <GameClassIcon
                    gameClass={roles.find(role => roleKey(role) === captainRole.role)!.gameClass}
                    size={18}
                  />
                  <span safe>{roleName(roles, captainRole.role)}</span>
                </span>
              ) : (
                <></>
              )}
              <span class="flex items-center justify-between gap-2 font-bold text-white">
                <span class="truncate" title={nameOf(view, captain)} safe>
                  {nameOf(view, captain)}
                </span>
                <IconCrown size={24} />
              </span>
            </div>
            {numbers.map(number => {
              const pick = view.draft.picks[number - 1]
              return pick ? (
                <div class="flex min-h-[60px] flex-col justify-center rounded-lg border border-zinc-700 bg-zinc-800 p-2">
                  <span class="flex items-center gap-1 text-sm font-bold text-zinc-400">
                    <GameClassIcon
                      gameClass={roles.find(role => roleKey(role) === pick.role)!.gameClass}
                      size={18}
                    />
                    <span safe>{roleName(roles, pick.role)}</span>
                  </span>
                  <span
                    class="truncate font-bold text-zinc-200"
                    title={nameOf(view, pick.player)}
                    safe
                  >
                    {nameOf(view, pick.player)}
                  </span>
                </div>
              ) : (
                <div
                  class={[
                    'flex min-h-[60px] items-center justify-center rounded-lg border border-dashed',
                    upcoming.has(number) ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800',
                  ]}
                  aria-label={`Pick ${number}`}
                >
                  <span
                    class={[
                      'flex size-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300',
                      !upcoming.has(number) && 'opacity-40',
                    ]}
                  >
                    {number}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function roleName(roles: readonly CaptainRole[], key: string) {
  return roles.find(role => roleKey(role) === key)?.name ?? key
}

function CaptainDraftRoleColumn(props: DraftProps & { role: CaptainRole }) {
  const view = props.view.draft!
  if (props.view.state !== QueueState.drafting) return <div id={columnId(props.role)}></div>
  const { role } = props
  const key = roleKey(role)
  const picked = new Set(view.draft.picks.map(pick => pick.player))
  const captains = new Set([view.draft.red, view.draft.blu])
  const filled = view.draft.picks.filter(pick => pick.role === key).length >= 2
  const members = view.members.filter(
    member =>
      member.roles.includes(key) &&
      !picked.has(member.player.steamId) &&
      !captains.has(member.player.steamId),
  )
  const onClock = !!view.turn && props.viewer === view.draft[view.turn.team]
  const isLegal = (steamId: SteamId64) =>
    !filled && view.legal.some(pick => pick.player === steamId && pick.role === key)
  // the captain on the clock sees what they can't pick fade out; spectators see everything alike
  const dimmed = filled || (onClock && !members.some(member => isLegal(member.player.steamId)))
  const rowClass =
    'flex h-8 w-full items-center justify-center rounded-lg border border-transparent bg-zinc-900 px-2 text-zinc-300 max-lg:min-h-10 data-highlight:border-zinc-500 data-highlight:bg-zinc-800'
  return (
    <div
      id={columnId(role)}
      class={['flex min-w-0 flex-col gap-2', dimmed && 'opacity-40']}
      data-role={key}
    >
      <div class="flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3">
        <GameClassIcon gameClass={role.gameClass} size={18} />
        <h2 class="min-w-0 flex-1 truncate font-bold text-white" safe>
          {role.name}
        </h2>
      </div>
      <ul class="flex flex-col gap-0.5">
        {members.length === 0 ? (
          <li class="flex h-8 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-500">
            No one left
          </li>
        ) : (
          members.map(member => {
            const steamId = member.player.steamId
            return (
              <li>
                {onClock && isLegal(steamId) ? (
                  <button
                    type="button"
                    class={[rowClass, 'cursor-pointer hover:border-zinc-500 hover:bg-zinc-800']}
                    aria-label={`Pick ${member.player.name} as ${roleLabel(role)}`}
                    title={member.player.name}
                    data-draft-player={steamId}
                    ws-send
                    hx-trigger="click"
                    hx-vals={JSON.stringify({ pickplayer: steamId, pickrole: key })}
                    data-pick-button
                    data-umami-event="captain-pick"
                  >
                    <span class="min-w-0 truncate" safe>
                      {member.player.name}
                    </span>
                  </button>
                ) : (
                  <div
                    class={[rowClass, onClock && 'cursor-default opacity-40']}
                    title={member.player.name}
                    data-draft-player={steamId}
                  >
                    <span class="min-w-0 truncate" safe>
                      {member.player.name}
                    </span>
                  </div>
                )}
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

CaptainDraft.skeleton = CaptainDraftSkeleton
CaptainDraft.status = CaptainDraftStatus
CaptainDraft.board = CaptainDraftBoard
CaptainDraft.roleColumn = CaptainDraftRoleColumn

// The sign-up section's heading while a draft runs (D14).
CaptainDraft.nextGame = function CaptainNextGame(props: {
  view: PoolView
  viewer?: SteamId64 | undefined
}) {
  const { view } = props
  const lockedViewer = view.members.some(
    member => member.locked && member.player.steamId === props.viewer,
  )
  const active =
    view.state === QueueState.drafting ||
    view.state === QueueState.banningMaps ||
    view.state === QueueState.launching
  return (
    <div id="captain-next-game" class="empty:hidden">
      {active ? (
        <div class="flex flex-col gap-1 border-t border-zinc-800 pt-6">
          <h2 id="captain-next-game-title" class="text-xl font-bold text-zinc-50">
            Next game
          </h2>
          <p class="text-sm text-zinc-400">
            {lockedViewer
              ? "You're in the current draft."
              : "Sign up now — you'll be in the queue as soon as this draft ends."}
          </p>
        </div>
      ) : (
        <h2 id="captain-next-game-title" class="sr-only">
          Sign-up pool
        </h2>
      )}
    </div>
  )
}
