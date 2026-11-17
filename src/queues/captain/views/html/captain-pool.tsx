import type { PlayerModel } from '../../../../database/models/player.model'
import type { CaptainPoolModel } from '../../../../database/models/captain-pool.model'
import type { QueueModel } from '../../../../database/models/queue.model'
import { QueueState } from '../../../../database/models/queue-state.model'
import { GameClassIcon } from '../../../../html/components/game-class-icon'
import { IconCrown, IconLock } from '../../../../html/components/icons'
import { joinBlocker, type JoinBlockerPlayer } from '../../../auto/join-blocker'
import { captainRoles } from '../../captain-roles'
import type { PoolView } from '../../types/pool-view'
import { Tf2ClassName } from '../../../../shared/types/tf2-class-name'
import { CaptainCheckbox } from './captain-checkbox'
import { roleKey } from '../../role-key'
import { roleLabel } from '../../role-label'
import type { CaptainRole } from '../../types/captain-role'

type Actor = (JoinBlockerPlayer & Pick<PlayerModel, 'steamId'>) | undefined
type Queue = Pick<QueueModel, 'enabled' | 'requireVerification' | 'skillThreshold' | 'gamemode'>

interface PoolProps {
  queue: Queue
  view: PoolView
  actor?: Actor
}

function ownMembership({ view, actor }: PoolProps) {
  return actor ? view.members.find(member => member.player.steamId === actor.steamId) : undefined
}

// The volunteers and the role columns, the part of the captain queue page that depends on who is
// looking. A live update sends the parts below one by one, so no single message gets large.
export function CaptainPool(props: PoolProps) {
  const roles = captainRoles(props.queue.gamemode)
  return (
    <form id="captain-pool" class="flex flex-col gap-4" ws-send data-disable-when-offline>
      <CaptainVolunteers {...props} />
      <CaptainBottleneck view={props.view} />
      <div class="grid grid-cols-2 gap-4 lg:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {roles.map(role => (
          <CaptainRoleColumn {...props} role={role} />
        ))}
      </div>
    </form>
  )
}

function CaptainVolunteers(props: PoolProps) {
  const { queue, view, actor } = props
  const volunteers = view.pool.filter(member => member.volunteer)
  return (
    <section
      id="captain-volunteers"
      class="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3"
      aria-label="Captain volunteers"
    >
      <VolunteerToggle queue={queue} own={ownMembership(props)} actor={actor} />
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
  )
}

function CaptainBottleneck(props: { view: PoolView }) {
  const { readiness } = props.view
  return (
    <p id="captain-bottleneck" class="text-sm text-zinc-400 empty:hidden" safe>
      {readiness.full ? '' : (readiness.bottleneck ?? 'missing: captain volunteers')}
    </p>
  )
}

function CaptainRoleColumn(props: PoolProps & { role: CaptainRole }) {
  const { view, role } = props
  return (
    <RoleColumn
      id={`captain-role-${role.gameClass}-${role.name}`}
      queue={props.queue}
      role={role}
      members={view.pool.filter(member => member.roles.includes(roleKey(role)))}
      own={ownMembership(props)}
      actor={props.actor}
      readyUp={view.state === QueueState.ready}
    />
  )
}

function VolunteerToggle(props: { queue: Queue; own: CaptainPoolModel | undefined; actor: Actor }) {
  if (!props.actor || props.own?.locked) {
    return <></>
  }

  const disabled = !props.own
    ? 'Sign up for a role first'
    : props.own.volunteer
      ? undefined
      : (joinBlocker(
          props.actor,
          { gameClass: Tf2ClassName.medic },
          { ...props.queue, skillThreshold: null },
          undefined,
        ) ?? undefined)
  return (
    <label class="relative flex items-center">
      <CaptainCheckbox
        label="Volunteer as captain"
        checked={props.own?.volunteer ?? false}
        disabled={!!disabled}
        vals={{ togglevolunteer: '' }}
        event="captain-volunteer"
      />
      {!!disabled && (
        <span class="tooltip whitespace-nowrap" safe>
          {disabled}
        </span>
      )}
    </label>
  )
}

function RoleColumn(props: {
  id: string
  queue: Queue
  role: CaptainRole
  members: CaptainPoolModel[]
  own: CaptainPoolModel | undefined
  actor: Actor
  readyUp: boolean
}) {
  const { role, members } = props
  const key = roleKey(role)
  const interactive = !!props.actor && !props.own?.locked
  const header = (
    <>
      <RoleCheckbox {...props} />
      <GameClassIcon gameClass={role.gameClass} size={18} />
      <h2 class="min-w-0 flex-1 truncate font-bold text-white" safe>
        {role.name}
      </h2>
      <span class="text-zinc-500">{members.length}/2</span>
    </>
  )
  const headerClass =
    'flex h-[54px] items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-[15px] has-checked:border-zinc-600'
  return (
    <div id={props.id} class="flex min-w-0 flex-col gap-2" data-role={key}>
      {interactive ? (
        <label class={[headerClass, 'relative cursor-pointer']}>{header}</label>
      ) : (
        <div class={headerClass}>{header}</div>
      )}
      <ul class="flex flex-col gap-0.5">
        {members.length === 0 ? (
          <li class="flex h-8 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-500">
            No one yet
          </li>
        ) : (
          members.map(member => (
            <li
              class={[
                'flex h-8 items-center justify-center truncate rounded-lg px-2 max-lg:min-h-10',
                props.readyUp && member.ready
                  ? 'bg-emerald-900 text-zinc-100'
                  : member.player.steamId === props.actor?.steamId
                    ? 'bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-900 text-zinc-300',
                props.readyUp &&
                  !member.ready &&
                  member.player.steamId === props.actor?.steamId &&
                  'outline outline-zinc-500',
              ]}
              data-player={member.player.steamId}
              data-ready={props.readyUp ? String(member.ready) : undefined}
            >
              <a
                href={`/players/${member.player.steamId}`}
                class="truncate"
                title={member.player.name}
                safe
              >
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
  const blocker = own?.roles.includes(key)
    ? undefined
    : (joinBlocker(actor, role, { ...props.queue, skillThreshold: null }, undefined) ?? undefined)
  return (
    <>
      <CaptainCheckbox
        label={`Sign up as ${roleLabel(role)}`}
        checked={own?.roles.includes(key) ?? false}
        disabled={!!blocker}
        vals={{ togglerole: key }}
        event="captain-toggle-role"
        eventRole={key}
      />
      {!!blocker && (
        <>
          <IconLock size={14} />
          <span class="tooltip whitespace-nowrap" safe>
            {blocker}
          </span>
        </>
      )}
    </>
  )
}

CaptainPool.volunteers = CaptainVolunteers
CaptainPool.bottleneck = CaptainBottleneck
CaptainPool.roleColumn = CaptainRoleColumn
