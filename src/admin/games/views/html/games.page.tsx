import { millisecondsToSeconds } from 'date-fns'
import { configuration } from '../../../../configuration'
import { IconMinus, IconPlus } from '../../../../html/components/icons'
import { LogsTfUploadMethod } from '../../../../shared/types/logs-tf-upload-method'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'
import { durationUnit } from '../../duration-unit'
import { GameServerCommandPreview } from './game-server-command-preview'
import { WhitelistId } from './whitelist-id'
import { defaultGamemode } from '../../../../shared/default-gamemode'
import type { Gamemode } from '../../../../shared/types/gamemode'

export async function GamesPage(props?: { gamemode?: Gamemode }) {
  const gamemode = props?.gamemode ?? defaultGamemode
  const whitelistId = await configuration.get('games.whitelist_id', gamemode)
  const joinGameServerTimeout = await configuration.get('games.join_gameserver_timeout')
  const rejoinGameServerTimeout = await configuration.get('games.rejoin_gameserver_timeout')
  const executeExtraCommands = await configuration.get('games.execute_extra_commands')
  const logsTfUploadMethod = await configuration.get('games.logs_tf_upload_method')
  const cooldownLevels = await configuration.get('games.cooldown_levels')

  const safeExecuteExtraCommands = executeExtraCommands.join('\n')

  return (
    <Admin activePage="games">
      <form action="" method="post">
        <div class="admin-panel-set flex flex-col gap-4">
          <WhitelistId gamemode={gamemode} />

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
              <span class="text-abru-light-75 text-sm">
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
              <span class="text-abru-light-75 text-sm">
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
              <span class="text-abru-light-75 text-sm">
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

          <dl>
            <dt>Game server startup commands</dt>
            <dd class="flex flex-col">
              <GameServerCommandPreview
                whitelistId={whitelistId}
                executeExtraCommands={executeExtraCommands}
                logsTfUploadMethod={logsTfUploadMethod}
              />
              <span class="text-abru-light-75 text-sm">
                Commands executed on the game server when a game starts, in order. Reflects the
                saved configuration above.
              </span>
            </dd>
          </dl>

          <dl>
            <dt>Cooldown levels</dt>
            <dd class="flex flex-col gap-2">
              <div class="cooldown-levels-list flex flex-col gap-2" id="cooldownLevelsList">
                {cooldownLevels.map(({ banLengthMs }) => (
                  <CooldownLevelEntry banLengthMs={banLengthMs} />
                ))}
              </div>
              <button
                type="button"
                class="flex w-fit flex-row items-center gap-2 text-white hover:underline"
                data-umami-event="add-cooldown-level"
                hx-post="/admin/games/cooldown-level"
                hx-trigger="click"
                hx-target="#cooldownLevelsList"
                hx-swap="beforeend"
              >
                <IconPlus />
                Add level
              </button>
              <span class="text-abru-light-75 text-sm">
                When a player is subbed out of a game, they receive a ban. The ban length grows with
                each offence, following the levels above. Levels are applied top to bottom; a player
                past the last level always gets the last ban length.
              </span>
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

export function CooldownLevelEntry(props: { banLengthMs: number }) {
  const { value, unit } = durationUnit.split(props.banLengthMs)

  return (
    <div class="cooldown-level-row flex flex-row items-center gap-2">
      <span class="cooldown-level-index text-abru-light-75 w-6 shrink-0 text-end tabular-nums" />
      <input
        type="number"
        name="banLength[]"
        value={value.toString()}
        min="0"
        step="any"
        required
        class="w-24 min-w-0"
      />
      <select name="banLengthUnit[]" class="w-28 shrink-0">
        {durationUnit.all.map(u => (
          <option value={u} selected={u === unit}>
            {u}
          </option>
        ))}
      </select>
      <button
        type="button"
        class="text-abru-light-75 shrink-0 hover:text-white"
        aria-label="Remove level"
        data-remove-closest=".cooldown-level-row"
      >
        <IconMinus />
      </button>
    </div>
  )
}
