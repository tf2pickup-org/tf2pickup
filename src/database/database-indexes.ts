import type { IndexDescription } from 'mongodb'
import { collections } from './collections'

interface CollectionIndexGroup {
  collectionName: string
  indexes: IndexDescription[]
}

export function databaseIndexes(): CollectionIndexGroup[] {
  return [
    {
      collectionName: collections.announcements.collectionName,
      indexes: [
        { name: 'announcements_enabled_createdAt', key: { enabled: 1, createdAt: -1 } },
        { name: 'announcements_createdAt', key: { createdAt: -1 } },
      ],
    },
    {
      collectionName: collections.certificates.collectionName,
      indexes: [{ name: 'certificates_purpose_unique', key: { purpose: 1 }, unique: true }],
    },
    {
      collectionName: collections.chatMessages.collectionName,
      indexes: [{ name: 'chatMessages_at', key: { at: -1 } }],
    },
    {
      collectionName: collections.configuration.collectionName,
      indexes: [{ name: 'configuration_key_unique', key: { key: 1 }, unique: true }],
    },
    {
      collectionName: collections.discordBotState.collectionName,
      indexes: [{ name: 'discordBotState_guildId_unique', key: { guildId: 1 }, unique: true }],
    },
    {
      collectionName: collections.discordSubstituteNotifications.collectionName,
      indexes: [
        {
          name: 'discordSubstituteNotifications_guildId_gameNumber_slotId_unique',
          key: { guildId: 1, gameNumber: 1, slotId: 1 },
          unique: true,
        },
      ],
    },
    {
      collectionName: collections.documents.collectionName,
      indexes: [{ name: 'documents_name_unique', key: { name: 1 }, unique: true }],
    },
    {
      collectionName: collections.gameLogs.collectionName,
      indexes: [
        {
          name: 'gamelogs_logSecret_unique',
          key: { logSecret: 1 },
          unique: true,
          sparse: true,
        },
      ],
    },
    {
      collectionName: collections.games.collectionName,
      indexes: [
        { name: 'games_number_unique', key: { number: 1 }, unique: true },
        { name: 'games_state', key: { state: 1 } },
        { name: 'games_events0at', key: { 'events.0.at': -1 } },
        { name: 'games_slotsPlayer_events0at', key: { 'slots.player': 1, 'events.0.at': -1 } },
        { name: 'games_logSecret_unique', key: { logSecret: 1 }, unique: true, sparse: true },
      ],
    },
    {
      collectionName: collections.gamesSubstituteRequests.collectionName,
      indexes: [
        {
          name: 'gamesSubstituteRequests_gameNumber_slotId_unique',
          key: { gameNumber: 1, slotId: 1 },
          unique: true,
        },
      ],
    },
    {
      collectionName: collections.keys.collectionName,
      indexes: [{ name: 'keys_name_unique', key: { name: 1 }, unique: true }],
    },
    {
      collectionName: collections.maps.collectionName,
      indexes: [{ name: 'maps_name_unique', key: { name: 1 }, unique: true }],
    },
    {
      collectionName: collections.onlinePlayers.collectionName,
      indexes: [{ name: 'onlinePlayers_steamId_unique', key: { steamId: 1 }, unique: true }],
    },
    {
      collectionName: collections.playerActions.collectionName,
      indexes: [{ name: 'playerActions_timestamp', key: { timestamp: -1 } }],
    },
    {
      collectionName: collections.players.collectionName,
      indexes: [
        { name: 'players_steamId_unique', key: { steamId: 1 }, unique: true },
        { name: 'players_preReadyUntil', key: { preReadyUntil: 1 } },
      ],
    },
    {
      collectionName: collections.queueFriends.collectionName,
      indexes: [{ name: 'queueFriends_source_unique', key: { source: 1 }, unique: true }],
    },
    {
      collectionName: collections.queueMapOptions.collectionName,
      indexes: [{ name: 'queueMapOptions_name_unique', key: { name: 1 }, unique: true }],
    },
    {
      collectionName: collections.queueMapVotes.collectionName,
      indexes: [{ name: 'queueMapVotes_player_unique', key: { player: 1 }, unique: true }],
    },
    {
      collectionName: collections.queueSlots.collectionName,
      indexes: [
        { name: 'queueSlots_id_unique', key: { id: 1 }, unique: true },
        {
          name: 'queueSlots_playerSteamId_unique',
          key: { 'player.steamId': 1 },
          unique: true,
          partialFilterExpression: { 'player.steamId': { $exists: true } },
        },
      ],
    },
    {
      collectionName: collections.secrets.collectionName,
      indexes: [{ name: 'secrets_name_unique', key: { name: 1 }, unique: true }],
    },
    {
      collectionName: collections.staticGameServers.collectionName,
      indexes: [
        { name: 'staticGameServers_id_unique', key: { id: 1 }, unique: true },
        { name: 'staticGameServers_address_port_unique', key: { address: 1, port: 1 }, unique: true },
        { name: 'staticGameServers_isOnline_game', key: { isOnline: 1, game: 1 } },
        { name: 'staticGameServers_isOnline_lastHeartbeatAt', key: { isOnline: 1, lastHeartbeatAt: 1 } },
      ],
    },
    {
      collectionName: collections.streams.collectionName,
      indexes: [{ name: 'streams_id_unique', key: { id: 1 }, unique: true }],
    },
    {
      collectionName: collections.tasks.collectionName,
      indexes: [{ name: 'tasks_at', key: { at: 1 } }],
    },
  ]
}

