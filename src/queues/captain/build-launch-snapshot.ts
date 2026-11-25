import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import type { QueueModel } from '../../database/models/queue.model'
import { errors } from '../../errors'
import { Tf2Team } from '../../shared/types/tf2-team'
import { assertCaptainQueue } from './assert-captain-queue'
import { captainRoles } from './captain-roles'
import { finalCaptainRoles } from './final-captain-roles'
import { getDraftPosition } from './get-draft-position'
import { roleKey } from './role-key'
import type { LaunchSnapshot } from '../types/launch-snapshot'

export function buildLaunchSnapshot(
  queue: QueueModel,
  draft: CaptainDraftModel,
  members: readonly CaptainPoolModel[],
): Extract<LaunchSnapshot, { captains: unknown }> {
  assertCaptainQueue(queue)
  const roles = captainRoles(queue.gamemode)
  const captains = finalCaptainRoles(getDraftPosition(roles, draft, members))
  if (!captains) throw errors.internalServerError('captain draft teams are incomplete')
  const remaining = draft.mapOptions.filter(map => !draft.bans.some(ban => ban.map === map))
  if (remaining.length !== 1) throw errors.internalServerError('captain draft has no final map')
  const seats = [...draft.picks, ...captains]
  return {
    queue,
    token: draft.token,
    captains: { red: draft.red, blu: draft.blu },
    map: remaining[0]!,
    slots: [Tf2Team.red, Tf2Team.blu].flatMap(team => {
      const counts = new Map<string, number>()
      return roles.map(role => {
        const seat = seats.find(seat => seat.team === team && seat.role === roleKey(role))!
        const number = (counts.get(role.gameClass) ?? 0) + 1
        counts.set(role.gameClass, number)
        return {
          id: `${team}-${role.gameClass}-${number}` as const,
          team,
          player: seat.player,
          gameClass: role.gameClass,
          status: SlotStatus.active,
          connectionStatus: PlayerConnectionStatus.offline,
        }
      })
    }),
  }
}
