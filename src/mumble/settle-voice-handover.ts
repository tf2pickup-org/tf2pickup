import { collections } from '../database/collections'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import type { GameNumber } from '../database/models/game.model'
import { games } from '../games'
import { client } from './client'
import { findGameChannels } from './find-game-channels'
import { findTargetChannel } from './find-target-channel'
import { runInCommandQueue } from './run-in-command-queue'

// A replaced player keeps their team channel until whoever took the slot is both on the game
// server and in that channel; then they lose access and are moved out to the games channel.
export async function settleVoiceHandover(gameNumber: GameNumber) {
  const channels = await findGameChannels(gameNumber)
  const game = await collections.games.findOne({ number: gameNumber })
  if (!client || !channels || !game) {
    return
  }

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
    const inTeamChannel = client.users
      .findAll(user => user.hash === hash)
      .some(user => user.channelId === channels[slot.team].id)
    if (hash && inTeamChannel) {
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
  const gamesChannel = await findTargetChannel(client)
  for (const user of client.users.findAll(
    ({ hash, channelId }) => !!hash && hashes.includes(hash) && gameChannelIds.includes(channelId),
  )) {
    await runInCommandQueue(async () => await user.moveToChannel(gamesChannel!.id))
  }
}
