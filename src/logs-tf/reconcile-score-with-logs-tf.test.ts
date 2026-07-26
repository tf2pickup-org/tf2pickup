import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../games', () => ({
  games: {
    findOne: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import { games } from '../games'
import { Tf2Team } from '../shared/types/tf2-team'
import { GameEventType } from '../database/models/game-event.model'
import { reconcileScoreWithLogsTf } from './reconcile-score-with-logs-tf'
import type { GameNumber } from '../database/models/game.model'
import type { LogsTfLogData } from '../database/models/logs-tf-log.model'

const gameNumber = 2784 as GameNumber

const logsTfData = (blu: number, red: number): LogsTfLogData =>
  ({ teams: { Blue: { score: blu }, Red: { score: red } } }) as unknown as LogsTfLogData

describe('reconcileScoreWithLogsTf', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(games.update).mockResolvedValue({} as never)
  })

  it('corrects the score and records an event when logs.tf disagrees', async () => {
    vi.mocked(games.findOne).mockResolvedValue({
      score: { [Tf2Team.blu]: 1, [Tf2Team.red]: 0 },
    } as never)

    await reconcileScoreWithLogsTf(gameNumber, logsTfData(0, 1))

    expect(games.update).toHaveBeenCalledWith(gameNumber, {
      $set: { 'score.blu': 0, 'score.red': 1 },
      $push: {
        events: {
          at: expect.any(Date),
          event: GameEventType.scoreCorrected,
          score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 1 },
        },
      },
    })
  })

  it('does nothing when the score already matches logs.tf', async () => {
    vi.mocked(games.findOne).mockResolvedValue({
      score: { [Tf2Team.blu]: 2, [Tf2Team.red]: 3 },
    } as never)

    await reconcileScoreWithLogsTf(gameNumber, logsTfData(2, 3))

    expect(games.update).not.toHaveBeenCalled()
  })

  it('does nothing when logs.tf has no team scores', async () => {
    vi.mocked(games.findOne).mockResolvedValue({
      score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 },
    } as never)

    await reconcileScoreWithLogsTf(gameNumber, { teams: {} } as unknown as LogsTfLogData)

    expect(games.findOne).not.toHaveBeenCalled()
    expect(games.update).not.toHaveBeenCalled()
  })
})
