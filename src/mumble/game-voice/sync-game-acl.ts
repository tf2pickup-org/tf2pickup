import type { AclEntry } from '@tf2pickup-org/mumble-client'
import { collections } from '../../database/collections'
import { SlotStatus } from '../../database/models/game-slot.model'
import { GameState, type GameModel } from '../../database/models/game.model'
import { Tf2Team } from '../../shared/types/tf2-team'
import { isVerificationEnabled } from '../is-verification-enabled'
import { mumblePermission } from '../mumble-permission'
import { findGameChannels } from './find-game-channels'
import type { VoiceChannel } from './voice-server'

// Rewrites the game's channel ACLs from scratch: the game channel lets in all of its players, each
// team channel only that team, including replaced players until the handover settles. Once the game
// is over, everyone can enter. Idempotent, so it's safe to rerun after a restart or a failure.
export async function syncGameAcl(game: Pick<GameModel, 'number' | 'state' | 'slots'>) {
  if (!(await isVerificationEnabled())) {
    return
  }

  const channels = await findGameChannels(game.number)
  if (!channels) {
    return
  }

  if ([GameState.ended, GameState.interrupted].includes(game.state)) {
    await save(channels.game, [{ group: 'all', applySubs: true }])
    await save(channels[Tf2Team.blu], [])
    await save(channels[Tf2Team.red], [])
    return
  }

  const members = game.slots
    .filter(({ status }) => [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(status))
    .flatMap(({ player, team, voiceOutgoing }) =>
      [player, ...(voiceOutgoing ?? [])].map(steamId => ({ steamId, team })),
    )
  const certificates = await collections.players
    .find(
      {
        steamId: { $in: members.map(({ steamId }) => steamId) },
        mumbleCertificate: { $exists: true },
      },
      { projection: { steamId: 1, 'mumbleCertificate.hash': 1 } },
    )
    .toArray()
  const entriesFor = (team?: Tf2Team) =>
    certificates
      .filter(({ steamId }) =>
        members.some(member => member.steamId === steamId && (!team || member.team === team)),
      )
      .map(({ mumbleCertificate }) => ({ group: `$${mumbleCertificate!.hash}`, applySubs: false }))

  await save(channels.game, entriesFor())
  await save(channels[Tf2Team.blu], entriesFor(Tf2Team.blu))
  await save(channels[Tf2Team.red], entriesFor(Tf2Team.red))
}

async function save(channel: VoiceChannel, entries: Pick<AclEntry, 'group' | 'applySubs'>[]) {
  await channel.saveAcl({
    inheritAcls: true,
    groups: [],
    entries: entries.map(entry => ({
      ...entry,
      applyHere: true,
      inherited: false,
      grant: mumblePermission.voice,
      deny: 0,
    })),
  })
}
