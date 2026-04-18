import {
  GameEventType,
  type GameEnded,
  type GameStarted,
  type PlayerReplaced,
} from '../database/models/game-event.model'
import { GameState, type GameModel } from '../database/models/game.model'
import { SlotStatus } from '../database/models/game-slot.model'
import { Tf2Team } from '../shared/types/tf2-team'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { GameNumber } from '../database/models/game.model'

export const defaultElo = 1500
export const provisionalThreshold = 10
const playTimeThreshold = 0.8

export interface EloUpdate {
  steamId: SteamId64
  gameClass: Tf2ClassName
  newElo: number
  at: Date
  game: GameNumber
}

function kFactor(gamesOnClass: number): number {
  return gamesOnClass < provisionalThreshold ? 32 : 16
}

function expectedScore(playerElo: number, enemyAvgElo: number): number {
  return 1 / (1 + Math.pow(10, (enemyAvgElo - playerElo) / 400))
}

function actualScore(playerTeam: Tf2Team, score: Record<Tf2Team, number>): number {
  const { red, blu } = score
  if (red === blu) return 0.5
  return playerTeam === (red > blu ? Tf2Team.red : Tf2Team.blu) ? 1 : 0
}

export function calculateEloUpdates(
  game: GameModel,
  getElo: (steamId: SteamId64, gameClass: Tf2ClassName) => number,
  getGamesPlayed: (steamId: SteamId64, gameClass: Tf2ClassName) => number,
): EloUpdate[] {
  if (game.state !== GameState.ended || !game.score) {
    return []
  }

  const startedEvent = game.events.find(
    (e): e is GameStarted => e.event === GameEventType.gameStarted,
  )
  const endedEvent = game.events.find(
    (e): e is GameEnded => e.event === GameEventType.gameEnded,
  )
  if (!startedEvent || !endedEvent) {
    return []
  }

  const gameStartedAt = startedEvent.at.getTime()
  const gameEndedAt = endedEvent.at.getTime()
  const gameDurationMs = gameEndedAt - gameStartedAt

  const replacements = game.events.filter(
    (e): e is PlayerReplaced => e.event === GameEventType.playerReplaced,
  )

  function timePlayedMs(steamId: SteamId64, status: SlotStatus): number {
    const joinedAs = replacements.find(e => e.replacement === steamId)
    if (joinedAs) {
      return gameEndedAt - joinedAs.at.getTime()
    }
    if (status === SlotStatus.waitingForSubstitute) {
      const wasReplaced = replacements.find(e => e.replacee === steamId)
      return wasReplaced ? wasReplaced.at.getTime() - gameStartedAt : 0
    }
    return gameDurationMs
  }

  const eligibleSlots = game.slots.filter(
    slot => timePlayedMs(slot.player, slot.status) / gameDurationMs > playTimeThreshold,
  )

  const score = game.score
  const endedAt = new Date(gameEndedAt)
  const updates: EloUpdate[] = []

  for (const slot of eligibleSlots) {
    const playerElo = getElo(slot.player, slot.gameClass)

    const enemies = eligibleSlots.filter(s => s.team !== slot.team)
    const sameClassEnemies = enemies.filter(s => s.gameClass === slot.gameClass)
    const comparison = sameClassEnemies.length > 0 ? sameClassEnemies : enemies

    if (comparison.length === 0) continue

    const enemyAvgElo =
      comparison.reduce((sum, s) => sum + getElo(s.player, s.gameClass), 0) / comparison.length

    const E = expectedScore(playerElo, enemyAvgElo)
    const S = actualScore(slot.team, score)
    const K = kFactor(getGamesPlayed(slot.player, slot.gameClass))
    const newElo = Math.round(playerElo + K * (S - E))

    updates.push({ steamId: slot.player, gameClass: slot.gameClass, newElo, at: endedAt, game: game.number })
  }

  return updates
}
