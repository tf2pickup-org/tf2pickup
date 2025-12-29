import type { Collection, CreateIndexesOptions, IndexSpecification } from 'mongodb'
import { logger } from '../logger'

interface IndexDefinition {
  key: IndexSpecification
  options?: CreateIndexesOptions
}

interface CollectionIndexes {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collection: Collection<any>
  indexes: IndexDefinition[]
}

/**
 * Creates indexes for a collection, handling duplicates gracefully.
 * If an index already exists, it will be skipped.
 * If an index creation fails due to duplicates, it logs a warning and continues.
 */
async function createCollectionIndexes(collectionIndexes: CollectionIndexes): Promise<void> {
  const collectionName = collectionIndexes.collection.collectionName

  for (const index of collectionIndexes.indexes) {
    try {
      await collectionIndexes.collection.createIndex(index.key, index.options)
      logger.debug({ collectionName, index: index.key }, 'index created')
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        logger.debug({ collectionName, index: index.key }, 'index already exists')
      } else {
        logger.warn({ collectionName, index: index.key, error }, 'failed to create index')
      }
    }
  }
}

/**
 * Defines and creates all indexes for the application's MongoDB collections.
 *
 * Index Design Rationale:
 *
 * 1. **players** collection
 *    - `steamId`: unique - Primary lookup key for players
 *    - `preReadyUntil`: For auto-cancel pre-ready queries (polling every second)
 *
 * 2. **games** collection
 *    - `number`: unique - Primary lookup key for games
 *    - `logSecret`: For matching game log events from game servers
 *    - `slots.player` + `events.0.at`: Compound index for player game history with sorting
 *    - `state` + `events.0.at`: For finding latest ended games (used in skill history)
 *
 * 3. **queueSlots** collection
 *    - `id`: unique - Primary lookup key for queue slots
 *    - `player.steamId`: For finding player's current slot
 *
 * 4. **queueFriends** collection
 *    - `source`: unique - One friendship per source player
 *
 * 5. **queueMapVotes** collection
 *    - `player`: unique - One vote per player
 *
 * 6. **tasks** collection
 *    - `name`: For canceling tasks by name
 *    - `at`: For finding pending tasks (scheduled execution)
 *    - `name` + `at`: Compound for efficient task processing
 *
 * 7. **configuration** collection
 *    - `key`: unique - Primary lookup key for configuration entries
 *
 * 8. **staticGameServers** collection
 *    - `id`: unique - Primary lookup key
 *    - `address` + `port`: unique compound - For heartbeat identification
 *    - `isOnline` + `game`: For finding free online servers
 *    - `isOnline` + `lastHeartbeatAt`: For detecting dead servers
 *
 * 9. **chatMessages** collection
 *    - `at`: descending - For sorting messages by time
 *
 * 10. **playerActions** collection
 *     - `timestamp`: descending - For sorting actions by time
 *
 * 11. **onlinePlayers** collection
 *     - `steamId`: unique - Primary lookup key
 *
 * 12. **secrets** collection
 *     - `name`: unique - Primary lookup key
 *
 * 13. **documents** collection
 *     - `name`: unique - Primary lookup key
 *
 * 14. **certificates** collection
 *     - `purpose`: unique - Primary lookup key
 *
 * 15. **gameLogs** collection
 *     - `logSecret`: unique, sparse - For matching logs to games
 *
 * 16. **gamesSubstituteRequests** collection
 *     - `gameNumber`: For finding all requests for a game
 *     - `gameNumber` + `slotId`: unique compound - For specific request lookup
 *
 * 17. **maps** collection
 *     - `name`: unique - Primary lookup key
 *
 * 18. **announcements** collection
 *     - `enabled` + `createdAt`: For filtering enabled announcements with sorting
 *
 * 19. **keys** collection
 *     - `name`: unique - Primary lookup key
 *
 * 20. **streams** collection
 *     - `id`: unique - Twitch stream ID
 *     - `player`: For finding streams by player
 *
 * 21. **discordSubstituteNotifications** collection
 *     - `gameNumber` + `slotId`: For finding notifications by game slot
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ensureIndexes(collections: Record<string, Collection<any>>): Promise<void> {
  logger.info('ensuring database indexes...')

  const allIndexes: CollectionIndexes[] = [
    // players collection
    {
      collection: collections['players']!,
      indexes: [
        { key: { steamId: 1 }, options: { unique: true } },
        { key: { preReadyUntil: 1 }, options: { sparse: true } },
      ],
    },

    // games collection
    {
      collection: collections['games']!,
      indexes: [
        { key: { number: 1 }, options: { unique: true } },
        { key: { logSecret: 1 }, options: { sparse: true } },
        { key: { 'slots.player': 1, 'events.0.at': -1 } },
        { key: { state: 1, 'events.0.at': -1 } },
      ],
    },

    // queueSlots collection
    {
      collection: collections['queueSlots']!,
      indexes: [
        { key: { id: 1 }, options: { unique: true } },
        { key: { 'player.steamId': 1 }, options: { sparse: true } },
      ],
    },

    // queueFriends collection
    {
      collection: collections['queueFriends']!,
      indexes: [{ key: { source: 1 }, options: { unique: true } }],
    },

    // queueMapVotes collection
    {
      collection: collections['queueMapVotes']!,
      indexes: [{ key: { player: 1 }, options: { unique: true } }],
    },

    // tasks collection
    {
      collection: collections['tasks']!,
      indexes: [{ key: { name: 1 } }, { key: { at: 1 } }, { key: { name: 1, at: 1 } }],
    },

    // configuration collection
    {
      collection: collections['configuration']!,
      indexes: [{ key: { key: 1 }, options: { unique: true } }],
    },

    // staticGameServers collection
    {
      collection: collections['staticGameServers']!,
      indexes: [
        { key: { id: 1 }, options: { unique: true } },
        { key: { address: 1, port: 1 }, options: { unique: true } },
        { key: { isOnline: 1, game: 1 } },
        { key: { isOnline: 1, lastHeartbeatAt: 1 } },
      ],
    },

    // chatMessages collection
    {
      collection: collections['chatMessages']!,
      indexes: [{ key: { at: -1 } }],
    },

    // playerActions collection
    {
      collection: collections['playerActions']!,
      indexes: [{ key: { timestamp: -1 } }],
    },

    // onlinePlayers collection
    {
      collection: collections['onlinePlayers']!,
      indexes: [{ key: { steamId: 1 }, options: { unique: true } }],
    },

    // secrets collection
    {
      collection: collections['secrets']!,
      indexes: [{ key: { name: 1 }, options: { unique: true } }],
    },

    // documents collection
    {
      collection: collections['documents']!,
      indexes: [{ key: { name: 1 }, options: { unique: true } }],
    },

    // certificates collection
    {
      collection: collections['certificates']!,
      indexes: [{ key: { purpose: 1 }, options: { unique: true } }],
    },

    // gameLogs collection
    {
      collection: collections['gameLogs']!,
      indexes: [{ key: { logSecret: 1 }, options: { unique: true, sparse: true } }],
    },

    // gamesSubstituteRequests collection
    {
      collection: collections['gamesSubstituteRequests']!,
      indexes: [
        { key: { gameNumber: 1 } },
        { key: { gameNumber: 1, slotId: 1 }, options: { unique: true } },
      ],
    },

    // maps collection
    {
      collection: collections['maps']!,
      indexes: [{ key: { name: 1 }, options: { unique: true } }],
    },

    // announcements collection
    {
      collection: collections['announcements']!,
      indexes: [{ key: { enabled: 1, createdAt: -1 } }],
    },

    // keys collection
    {
      collection: collections['keys']!,
      indexes: [{ key: { name: 1 }, options: { unique: true } }],
    },

    // streams collection
    {
      collection: collections['streams']!,
      indexes: [
        { key: { id: 1 }, options: { unique: true } },
        { key: { player: 1 }, options: { sparse: true } },
      ],
    },

    // discordSubstituteNotifications collection
    {
      collection: collections['discordSubstituteNotifications']!,
      indexes: [{ key: { gameNumber: 1, slotId: 1 } }],
    },
  ]

  await Promise.all(allIndexes.map(createCollectionIndexes))

  logger.info('database indexes ensured')
}
