import { logger } from '../logger'
import { games } from '../games'
import { Tf2Team } from '../shared/types/tf2-team'
import { GameEventType } from '../database/models/game-event.model'
import type { GameNumber } from '../database/models/game.model'
import type { LogsTfLogData } from '../database/models/logs-tf-log.model'

// logs.tf computes the authoritative final score for every game mode (it sets
// info.AD_scoring for attack/defend & payload maps). We still derive the score
// ourselves for instant feedback when the match ends, but once logs.tf has been
// parsed we treat it as the source of truth: if it disagrees with what we have,
// correct the score and record a visible "score corrected" event.
export async function reconcileScoreWithLogsTf(
  gameNumber: GameNumber,
  data: LogsTfLogData,
): Promise<void> {
  const blu = data.teams['Blue']?.score
  const red = data.teams['Red']?.score
  if (blu === undefined || red === undefined) {
    return
  }

  const game = await games.findOne({ number: gameNumber }, ['score'])
  if (game.score?.[Tf2Team.blu] === blu && game.score[Tf2Team.red] === red) {
    return
  }

  logger.info(
    { gameNumber, from: game.score, to: { blu, red } },
    'correcting final score to match logs.tf',
  )
  await games.update(gameNumber, {
    $set: { 'score.blu': blu, 'score.red': red },
    $push: {
      events: {
        at: new Date(),
        event: GameEventType.scoreCorrected,
        score: { [Tf2Team.blu]: blu, [Tf2Team.red]: red },
      },
    },
  })
}
