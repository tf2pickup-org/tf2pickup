import { GamesPage } from './views/html/games.page'
import { z } from 'zod'
import { LogsTfUploadMethod } from '../../shared/types/logs-tf-upload-method'
import { configuration } from '../../configuration'
import { standardAdminPage } from '../standard-admin-page'
import { secondsToMilliseconds } from 'date-fns'

export default standardAdminPage({
  path: '/admin/games',
  bodySchema: z.object({
    whitelistId: z.string(),
    joinGameserverTimeout: z.coerce.number(),
    rejoinGameserverTimeout: z.coerce.number(),
    executeExtraCommands: z.string().transform(value => value.split('\n')),
    logsTfUploadMethod: z.enum(LogsTfUploadMethod),
  }),
  save: async ({
    whitelistId,
    joinGameserverTimeout,
    rejoinGameserverTimeout,
    executeExtraCommands,
    logsTfUploadMethod,
  }) => {
    await Promise.all([
      configuration.set('games.whitelist_id', whitelistId),
      configuration.set(
        'games.join_gameserver_timeout',
        secondsToMilliseconds(joinGameserverTimeout),
      ),
      configuration.set(
        'games.rejoin_gameserver_timeout',
        secondsToMilliseconds(rejoinGameserverTimeout),
      ),
      configuration.set('games.execute_extra_commands', executeExtraCommands),
      configuration.set('games.logs_tf_upload_method', logsTfUploadMethod),
    ])
  },
  page: async user => await GamesPage({ user }),
})
