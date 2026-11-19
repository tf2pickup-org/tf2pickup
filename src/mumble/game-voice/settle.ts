import { collections } from '../../database/collections'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import type { GameNumber } from '../../database/models/game.model'
import { games } from '../../games'
import { isVerificationEnabled } from '../is-verification-enabled'
import { findGameChannels } from './find-game-channels'
import { mumbleVoiceServer } from './mumble-voice-server'

// A replaced player keeps their team channel until whoever took the slot is both on the game
// server and in that channel; then they lose access and are moved out to the games channel.
export async function settle(gameNumber: GameNumber) {
  if (!(await isVerificationEnabled())) {
    return
  }

  const gamesChannel = await mumbleVoiceServer.gamesChannel()
  const channels = await findGameChannels(gameNumber)
  const game = await collections.games.findOne({ number: gameNumber })
  if (!gamesChannel || !channels || !game) {
    return
  }

  const users = mumbleVoiceServer.users()
  const settled = []
  for (const slot of game.slots) {
    if (
      !slot.voiceOutgoing?.length ||
      slot.status !== SlotStatus.active ||
      slot.connectionStatus !== PlayerConnectionStatus.connected
    ) {
      continue
    }

    const holder = await collections.players.findOne(
      { steamId: slot.player },
      { projection: { 'mumbleCertificate.hash': 1 } },
    )
    const hash = holder?.mumbleCertificate?.hash
    if (
      hash &&
      users.some(user => user.hash === hash && user.channelId === channels[slot.team].id)
    ) {
      settled.push(slot)
    }
  }

  if (settled.length === 0) {
    return
  }

  // the ACL rewrite follows from game:updated
  await games.update(
    gameNumber,
    { $unset: { 'slots.$[slot].voiceOutgoing': 1 } },
    { arrayFilters: [{ 'slot.id': { $in: settled.map(({ id }) => id) } }] },
  )

  const outgoing = await collections.players
    .find(
      { steamId: { $in: settled.flatMap(({ voiceOutgoing }) => voiceOutgoing!) } },
      { projection: { 'mumbleCertificate.hash': 1 } },
    )
    .toArray()
  const hashes = outgoing.flatMap(({ mumbleCertificate }) => mumbleCertificate?.hash ?? [])
  const gameChannelIds = [channels.game, ...channels.game.subChannels].map(({ id }) => id)
  for (const user of mumbleVoiceServer
    .users()
    .filter(
      ({ hash, channelId }) =>
        !!hash && hashes.includes(hash) && gameChannelIds.includes(channelId),
    )) {
    await user.moveToChannel(gamesChannel.id)
  }
}
