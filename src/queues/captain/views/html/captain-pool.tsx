import type { PlayerModel } from '../../../../database/models/player.model'
import type { CaptainPoolModel } from '../../../../database/models/captain-pool.model'
import type { QueueModel } from '../../../../database/models/queue.model'
import { QueueState } from '../../../../database/models/queue-state.model'
import { GameClassIcon } from '../../../../html/components/game-class-icon'
import { IconCrown, IconLock } from '../../../../html/components/icons'
import { joinBlocker, type JoinBlockerPlayer } from '../../../auto/join-blocker'
import { captainRoles } from '../../captain-roles'
import type { PoolView } from '../../pool-view'
import { roleKey } from '../../role-key'
import type { CaptainRole } from '../../types/captain-role'

type Actor = (JoinBlockerPlayer & Pick<PlayerModel, 'steamId'>) | undefined
type Queue = Pick<QueueModel, 'enabled' | 'requireVerification' | 'skillThreshold' | 'gamemode'>

// The volunteers and the role columns, the part of the captain queue page that depends on who is
// looking.
export function CaptainPool(props: { queue: Queue; view: PoolView; actor?: Actor }) {
  const { queue, view, actor } = props
  const roles = captainRoles(queue.gamemode)
  const own = actor ? view.pool.find(member => member.player.steamId === actor.steamId) : undefined
  const volunteers = view.pool.filter(member => member.volunteer)
  const readyUp = view.state === QueueState.ready

  return (
    <form id="captain-pool" class="flex flex-col gap-4" ws-send data-disable-when-offline>
      <section
        class="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3"
        aria-label="Captain volunteers"
      >
        <VolunteerToggle own={own} actor={actor} />
        <IconCrown size={20} />
        <span class="font-bold">Captain {volunteers.length}/2</span>
        {volunteers.map(member => (
          <a
            href={`/players/${member.player.steamId}`}
            class={[
              'rounded-sm px-2 py-0.5 text-zinc-300',
              member.player.steamId === actor?.steamId ? 'bg-zinc-700' : 'bg-zinc-800',
            ]}
            safe
          >
            {member.player.name}
          </a>
        ))}
      </section>

      {view.readiness.full ? (
        <></>
      ) : (
        <p id="captain-bottleneck" class="text-sm text-zinc-400" safe>
          {view.readiness.bottleneck ?? 'missing: captain volunteers'}
        </p>
      )}

      <div
        class="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:[grid-template-columns:repeat(var(--columns),minmax(0,1fr))]"
        style={`--columns: ${roles.length}`}
      >
        {roles.map(role => (
          <RoleColumn
            queue={queue}
            role={role}
            members={view.pool.filter(member => member.roles.includes(roleKey(role)))}
            own={own}
            actor={actor}
            readyUp={readyUp}
          />
        ))}
      </div>
    </form>
  )
}

function VolunteerToggle(props: { own: CaptainPoolModel | undefined; actor: Actor }) {
  if (!props.actor || props.own?.locked) {
    return <></>
  }

  const disabled = props.own ? undefined : 'Sign up for a role first'
  return (
    <label class="relative flex items-center" aria-label="Volunteer as captain">
      <input
        type="checkbox"
        class="size-6 accent-zinc-200"
        checked={props.own?.volunteer ?? false}
        disabled={!!disabled}
        ws-send
        hx-vals={JSON.stringify({ togglevolunteer: '' })}
        hx-trigger="change"
        data-umami-event="captain-volunteer"
      />
      <span class="sr-only">Volunteer as captain</span>
      {!!disabled && <span class="tooltip whitespace-nowrap">{disabled}</span>}
    </label>
  )
}

function RoleColumn(props: {
  queue: Queue
  role: CaptainRole
  members: CaptainPoolModel[]
  own: CaptainPoolModel | undefined
  actor: Actor
  readyUp: boolean
}) {
  const { role, members } = props
  const key = roleKey(role)
  return (
    <div class="flex min-w-0 flex-col gap-2" data-role={key}>
      <div class="flex h-[54px] items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-[15px]">
        <RoleCheckbox {...props} />
        <GameClassIcon gameClass={role.gameClass} size={18} />
        <h2 class="min-w-0 flex-1 truncate font-bold text-white" safe>
          {role.name}
        </h2>
        <span class="text-zinc-500">{members.length}/2</span>
      </div>
      <ul class="flex flex-col gap-0.5">
        {members.length === 0 ? (
          <li class="flex h-8 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-500">
            No one yet
          </li>
        ) : (
          members.map(member => (
            <li
              class={[
                'flex h-8 items-center justify-center truncate rounded-lg px-2 text-zinc-300 max-lg:min-h-10',
                member.player.steamId === props.actor?.steamId ? 'bg-zinc-800' : 'bg-zinc-900',
                props.readyUp && member.ready && 'bg-emerald-900 text-zinc-100',
              ]}
              data-player={member.player.steamId}
              data-ready={props.readyUp ? String(member.ready) : undefined}
            >
              <a href={`/players/${member.player.steamId}`} class="truncate" safe>
                {member.player.name}
              </a>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function RoleCheckbox(props: {
  queue: Queue
  role: CaptainRole
  own: CaptainPoolModel | undefined
  actor: Actor
}) {
  const { actor, own, role } = props
  if (!actor || own?.locked) {
    return <></>
  }

  const key = roleKey(role)
  const blocker = own
    ? undefined
    : (joinBlocker(actor, role, { ...props.queue, skillThreshold: null }, undefined) ?? undefined)
  return (
    <label class="relative flex items-center">
      <input
        type="checkbox"
        class="size-6 accent-zinc-200"
        checked={own?.roles.includes(key) ?? false}
        disabled={!!blocker}
        ws-send
        hx-vals={JSON.stringify({ togglerole: key })}
        hx-trigger="change"
        data-umami-event="captain-toggle-role"
        data-umami-event-role={key}
      />
      <span class="sr-only" safe>
        Sign up as {role.name}
      </span>
      {!!blocker && (
        <>
          <IconLock size={14} />
          <span class="tooltip whitespace-nowrap" safe>
            {blocker}
          </span>
        </>
      )}
    </label>
  )
}
