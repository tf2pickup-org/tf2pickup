import { millisecondsToSeconds } from 'date-fns'
import { configuration } from '../../../../configuration'
import { LogsTfUploadMethod } from '../../../../shared/types/logs-tf-upload-method'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'

export async function GamesPage() {
  const whitelistId = await configuration.get('games.whitelist_id')
  const joinGameServerTimeout = await configuration.get('games.join_gameserver_timeout')
  const rejoinGameServerTimeout = await configuration.get('games.rejoin_gameserver_timeout')
  const executeExtraCommands = await configuration.get('games.execute_extra_commands')
  const logsTfUploadMethod = await configuration.get('games.logs_tf_upload_method')

  const safeExecuteExtraCommands = executeExtraCommands.join('\n')

  return (
    <Admin activePage="games">
      <form action="" method="post">
        <div class="admin-panel-set flex flex-col gap-4">
          <dl>
            <dt>
              <label for="whitelistId">Whitelist ID</label>
            </dt>
            <dd>
              <input
                type="text"
                name="whitelistId"
                value={whitelistId ?? ''}
                id="whitelistId"
                class="col-span-3"
              />
            </dd>
          </dl>

          <dl>
            <dt>
              <label for="joinGameserverTimeout">Join gameserver timeout</label>
            </dt>
            <dd class="flex flex-col">
              <div>
                <input
                  type="number"
                  name="joinGameserverTimeout"
                  value={millisecondsToSeconds(joinGameServerTimeout).toString()}
                  id="joinGameserverTimeout"
                  class="col-span-2 me-2"
                />
                <span class="text-white">seconds</span>
              </div>
              <span class="text-sm text-abru-light-75">
                The time a player has to join the gameserver before they are getting subbed
                automatically. Use 0 to disable.
              </span>
            </dd>
          </dl>

          <dl>
            <dt>
              <label for="rejoinGameserverTimeout">Rejoin gameserver timeout</label>
            </dt>
            <dd class="flex flex-col">
              <div>
                <input
                  type="number"
                  name="rejoinGameserverTimeout"
                  value={millisecondsToSeconds(rejoinGameServerTimeout).toString()}
                  id="rejoinGameserverTimeout"
                  class="col-span-2 me-2"
                />
                <span class="text-white">seconds</span>
              </div>
              <span class="text-sm text-abru-light-75">
                The time a player has to come back to the gameserver after they go offline during
                the match. Use 0 to disable.
              </span>
            </dd>
          </dl>

          <dl>
            <dt>
              <label for="executeExtraCommands">Execute extra commands</label>
            </dt>
            <dd class="flex flex-col">
              <textarea rows="3" id="executeExtraCommands" name="executeExtraCommands">
                {safeExecuteExtraCommands}
              </textarea>
              <span class="text-sm text-abru-light-75">
                Extra commands to execute on the gameserver before the match starts. One command per
                line.
              </span>
            </dd>
          </dl>

          <dl>
            <dt>
              <label for="logsTfUploadMethod">logs.tf upload method</label>
            </dt>
            <dd>
              <select name="logsTfUploadMethod" id="logsTfUploadMethod">
                <option value="off" selected={logsTfUploadMethod === LogsTfUploadMethod.off}>
                  Off - no logs will be uploaded to logs.tf
                </option>
                <option
                  value="backend"
                  selected={logsTfUploadMethod === LogsTfUploadMethod.backend}
                >
                  Backend - logs will be uploaded by the tf2pickup.org server only
                </option>
                <option
                  value="gameserver"
                  selected={logsTfUploadMethod === LogsTfUploadMethod.gameserver}
                >
                  Gameserver - logs will be uploaded by the logs.tf sourcemod plugin
                </option>
              </select>
            </dd>
          </dl>

          <p class="mt-2">
            <SaveButton />
          </p>
        </div>
      </form>
    </Admin>
  )
}
