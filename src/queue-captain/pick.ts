import { configuration } from '../configuration'
import { collections } from '../database/collections'
import type { DraftModel } from '../database/models/draft.model'
import { QueueState } from '../database/models/queue-state.model'
import { environment } from '../environment'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { queueConfigs } from '../queue-auto/configs'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { Tf2Team } from '../shared/types/tf2-team'
import { canFillSlots } from './can-form-teams'
import { getPickOrder } from './get-pick-order'

export async function pick(
  captainSteamId: SteamId64,
  playerSteamId: SteamId64,
  gameClass: Tf2ClassName,
): Promise<DraftModel> {
  return await withQueueLock('captain.pick', async () => {
    logger.trace({ captainSteamId, playerSteamId, gameClass }, 'queue-captain.pick()')

    const state = await getState()
    if (state !== QueueState.draft) {
      throw errors.badRequest('invalid queue state')
    }

    const draft = await collections.captainDraft.findOne({})
    if (!draft) {
      throw errors.internalServerError('no active draft')
    }

    if (draft.captains[draft.currentTurn] !== captainSteamId) {
      throw errors.forbidden('not your turn')
    }

    const alreadyPickedIds = draft.picks.map(p => p.player)
    const captainIds = Object.values(draft.captains)

    if (alreadyPickedIds.includes(playerSteamId) || captainIds.includes(playerSteamId)) {
      throw errors.badRequest('player already assigned')
    }

    const allPlayers = await collections.queuePlayers.find({}).toArray()
    const remainingPool = allPlayers.filter(
      p => !alreadyPickedIds.includes(p.steamId) && !captainIds.includes(p.steamId),
    )

    const pickedPlayer = remainingPool.find(p => p.steamId === playerSteamId)
    if (!pickedPlayer) {
      throw errors.notFound('player not in queue')
    }

    if (!pickedPlayer.offeredClasses.includes(gameClass)) {
      throw errors.badRequest('player does not offer that class')
    }

    const config = queueConfigs[environment.QUEUE_CONFIG]

    const classPickCount: Partial<Record<Tf2ClassName, number>> = {}
    for (const p of draft.picks) {
      classPickCount[p.gameClass] = (classPickCount[p.gameClass] ?? 0) + 1
    }
    classPickCount[gameClass] = (classPickCount[gameClass] ?? 0) + 1

    const remainingSlots: Tf2ClassName[] = []
    for (const cls of config.classes) {
      const total = cls.count * config.teamCount
      const picked = classPickCount[cls.name] ?? 0
      for (let i = 0; i < total - picked; i++) {
        remainingSlots.push(cls.name)
      }
    }

    const afterPickPool = remainingPool.filter(p => p.steamId !== playerSteamId)
    // Captains fill any class (create.ts assigns them to the first unfilled class),
    // so treat them as wildcards when checking feasibility.
    const captainWildcards = Object.values(draft.captains).map(steamId => ({
      steamId,
      offeredClasses: config.classes.map(c => c.name),
    }))
    if (!canFillSlots([...afterPickPool, ...captainWildcards], remainingSlots)) {
      throw errors.badRequest('pick would make it impossible to complete the draft')
    }

    const newPick = {
      captain: captainSteamId,
      player: playerSteamId,
      gameClass,
      team: draft.currentTurn,
    }
    const updatedPicks = [...draft.picks, newPick]

    const pickOrder = getPickOrder(config)
    const isPickingDone = updatedPicks.length >= pickOrder.length
    const nextTurn = isPickingDone ? Tf2Team.blu : pickOrder[updatedPicks.length]!

    const timeout = await configuration.get('queue.captain_pick_timeout')
    const updated = (await collections.captainDraft.findOneAndUpdate(
      {},
      {
        $set: {
          picks: updatedPicks,
          currentTurn: nextTurn,
          expiresAt: new Date(Date.now() + timeout),
        },
      },
      { returnDocument: 'after' },
    ))!

    events.emit('queue/draft:pickMade', {
      captain: captainSteamId,
      player: playerSteamId,
      gameClass,
      team: draft.currentTurn,
    })

    return updated
  })
}
