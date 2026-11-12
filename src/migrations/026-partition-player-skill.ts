import { MongoServerError } from 'mongodb'
import { collections } from '../database/collections'
import { environment } from '../environment'
import { Gamemode } from '../shared/types/gamemode'

// Skill used to be a single class→skill map, because an instance ran exactly one gamemode.
export async function up() {
  const gamemode = environment.QUEUE_CONFIG

  await collections.players.updateMany(
    {
      skill: { $type: 'object' },
      $nor: Object.values(Gamemode).map(g => ({ [`skill.${g}`]: { $exists: true } })),
    },
    [{ $set: { skill: { $arrayToObject: [[{ k: gamemode, v: '$skill' }]] } } }],
  )
  await collections.players.updateMany({ 'skillHistory.0': { $exists: true } }, [
    {
      $set: {
        skillHistory: {
          $map: { input: '$skillHistory', in: { $mergeObjects: [{ gamemode }, '$$this'] } },
        },
      },
    },
  ])

  await collections.futurePlayerSkills.updateMany(
    { gamemode: { $exists: false } },
    { $set: { gamemode } },
  )
  try {
    await collections.futurePlayerSkills.dropIndex('steamId_1')
  } catch (error) {
    if (!(error instanceof MongoServerError && error.codeName === 'IndexNotFound')) {
      throw error
    }
  }

  // pending imports are short-lived previews; an admin can re-upload the file
  await collections.pendingImports.deleteMany({})
}
