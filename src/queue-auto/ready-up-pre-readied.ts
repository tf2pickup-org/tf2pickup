import { collections } from '../database/collections'
import type { PlayerModel } from '../database/models/player.model'
import { errors } from '../errors'
import { events } from '../events'
import { preReady } from '../pre-ready'

export async function readyUpPreReadied(): Promise<void> {
  const last = (await collections.queueState.findOne())?.last
  if (!last) {
    throw errors.internalServerError('invalid queue state: last undefined')
  }

  const preReadiedPlayers = await collections.players
    .find<Pick<PlayerModel, 'steamId'>>(
      { preReadyUntil: { $gte: new Date() } },
      { projection: { steamId: 1 } },
    )
    .toArray()
  const toReadyUp = (
    await collections.queueSlots
      .find({ 'player.steamId': { $in: preReadiedPlayers.map(({ steamId }) => steamId) } })
      .toArray()
  ).map(slot => slot.player!.steamId)

  const slots = (
    await Promise.all(
      [...toReadyUp, last].map(
        async player =>
          await collections.queueSlots.findOneAndUpdate(
            { 'player.steamId': player },
            {
              $set: { ready: true },
            },
            { returnDocument: 'after' },
          ),
      ),
    )
  ).filter(slot => slot !== null)
  events.emit('queue/slots:updated', { slots })
  await preReady.start(last)
}
