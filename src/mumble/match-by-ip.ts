import { Html } from '@kitajs/html'
import type { User } from '@tf2pickup-org/mumble-client'
import { collections } from '../database/collections'
import { SlotStatus } from '../database/models/game-slot.model'
import { GameState } from '../database/models/game.model'
import { MumbleVerificationMethod } from '../database/models/player.model'
import { logger } from '../logger'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { bindCertificate } from './bind-certificate'
import { client } from './client'
import { fetchUserAddress } from './fetch-user-address'
import { verificationCount } from './verification-count'

// Binds the one unbound Mumble session at this address to the one unbound player in a live game
// who connected to the game server from it. Anything else is ambiguous and left to the code flow.
export async function matchByIp(address: string, connected?: SteamId64) {
  const [sessions, candidates] = await Promise.all([
    findUnboundSessions(address),
    findUnboundPlayers(address, connected),
  ])
  if (sessions.length === 0 || candidates.length === 0) {
    return
  }

  if (sessions.length > 1 || candidates.length > 1) {
    verificationCount.add(1, { method: MumbleVerificationMethod.ipMatch, outcome: 'ambiguous' })
    logger.info(
      { sessions: sessions.length, players: candidates.length },
      'ambiguous mumble ip match',
    )
    return
  }

  const [user] = sessions as [User & { hash: string }]
  const [player] = candidates as [(typeof candidates)[number]]
  const result = await bindCertificate(player.steamId, user.hash, MumbleVerificationMethod.ipMatch)
  if (result.outcome === 'conflict') {
    logger.warn(
      { player: player.steamId, owner: result.owner, mumbleUser: user.name },
      'mumble certificate is linked to another player',
    )
    return
  }

  await user.sendMessage(`You're verified as ${Html.escapeHtml(player.name)}.`)
}

async function findUnboundSessions(address: string) {
  const users = (client?.users.findAll(user => !!user.hash) ?? []).filter(
    user => user.session !== client?.self?.session,
  )
  const bound = await collections.players
    .find({ 'mumbleCertificate.hash': { $in: users.map(({ hash }) => hash!) } })
    .project<{ mumbleCertificate: { hash: string } }>({ 'mumbleCertificate.hash': 1 })
    .toArray()
  const boundHashes = new Set(bound.map(({ mumbleCertificate }) => mumbleCertificate.hash))

  const unbound = users.filter(({ hash }) => !boundHashes.has(hash!))
  const userAddresses = await Promise.all(unbound.map(fetchUserAddress))
  return unbound.filter((_, i) => userAddresses[i] === address)
}

async function findUnboundPlayers(address: string, connected?: SteamId64) {
  const games = await collections.games
    .find(
      { state: { $in: [GameState.launching, GameState.started] } },
      { projection: { number: 1, slots: 1 } },
    )
    .toArray()
  const inGame = new Set(
    games.flatMap(({ slots }) =>
      slots
        .filter(({ status }) =>
          [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(status),
        )
        .map(({ player }) => player),
    ),
  )

  // recorded by player-actions on match/player:connected
  const connections = await collections.playerActions.distinct('player', {
    ipAddress: address,
    action: { $in: games.map(({ number }) => `connected to gameserver (game #${number})`) },
  })
  const matching = new Set(
    [...connections, ...(connected ? [connected] : [])].filter(player => inGame.has(player)),
  )

  const found = await Promise.all(
    [...matching].map(steamId =>
      players.bySteamId(steamId, ['steamId', 'name', 'mumbleCertificate']),
    ),
  )
  return found.filter(({ mumbleCertificate }) => !mumbleCertificate)
}
