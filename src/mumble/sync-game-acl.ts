import { collections } from '../database/collections'
import { SlotStatus } from '../database/models/game-slot.model'
import type { GameModel } from '../database/models/game.model'
import { Tf2Team } from '../shared/types/tf2-team'
import { findGameChannels } from './find-game-channels'
import { mumblePermission } from './mumble-permission'
import { runInCommandQueue } from './run-in-command-queue'

// Rewrites the game's channel ACLs from scratch: the game channel lets in all of its players, each
// team channel only that team. Idempotent, so it's safe to rerun after a restart or a failure.
export async function syncGameAcl(game: Pick<GameModel, 'number' | 'slots'>) {
  const channels = await findGameChannels(game.number)
  if (!channels) {
    return
  }

  const slots = game.slots.filter(({ status }) =>
    [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(status),
  )
  const certificates = await collections.players
    .find(
      { steamId: { $in: slots.map(({ player }) => player) }, mumbleCertificate: { $exists: true } },
      { projection: { steamId: 1, 'mumbleCertificate.hash': 1 } },
    )
    .toArray()
  const hashesOf = (team?: Tf2Team) =>
    certificates
      .filter(({ steamId }) =>
        slots.some(slot => slot.player === steamId && (!team || slot.team === team)),
      )
      .map(({ mumbleCertificate }) => mumbleCertificate!.hash)

  for (const [channel, hashes] of [
    [channels.game, hashesOf()],
    [channels[Tf2Team.blu], hashesOf(Tf2Team.blu)],
    [channels[Tf2Team.red], hashesOf(Tf2Team.red)],
  ] as const) {
    await runInCommandQueue(async () => {
      await channel.saveAcl({
        inheritAcls: true,
        groups: [],
        entries: hashes.map(hash => ({
          applyHere: true,
          applySubs: false,
          inherited: false,
          group: `$${hash}`,
          grant: mumblePermission.voice,
          deny: 0,
        })),
      })
    })
  }
}
