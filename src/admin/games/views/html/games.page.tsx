import { configuration } from '../../../../configuration'
import { IconMinus, IconPlus } from '../../../../html/components/icons'
import { LogsTfUploadMethod } from '../../../../shared/types/logs-tf-upload-method'
import { Admin } from '../../../views/html/admin'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'
import { DurationInput } from '../../../views/html/duration-input'
import { durationUnit } from '../../duration-unit'
import { GameServerCommandPreview } from './game-server-command-preview'

export async function GamesPage() {
  const whitelistId = await configuration.get('games.whitelist_id')
  const joinGameServerTimeout = await configuration.get('games.join_gameserver_timeout')
  const rejoinGameServerTimeout = await configuration.get('games.rejoin_gameserver_timeout')
  const executeExtraCommands = await configuration.get('games.execute_extra_commands')
  const logsTfUploadMethod = await configuration.get('games.logs_tf_upload_method')
  const cooldownLevels = await configuration.get('games.cooldown_levels')
  const cooldownDecayPeriod = await configuration.get('games.cooldown_decay_period')

  const safeExecuteExtraCommands = executeExtraCommands.join('\n')

  return (
    <Admin activePage="games">
      <form action="" method="post" class="flex flex-col gap-4" data-save-bar>
        <SettingCard title="Whitelist">
          <SettingRow
            label="Whitelist ID"
            for="whitelistId"
            configKey="games.whitelist_id"
            description="Used by every queue that has no whitelist of its own; a queue's whitelist is set on its page."
          >
            <input type="text" name="whitelistId" value={whitelistId ?? ''} id="whitelistId" />
          </SettingRow>
        </SettingCard>

        <SettingCard title="Connecting">
          <SettingRow
            label="Join gameserver timeout"
            for="joinGameserverTimeout"
            configKey="games.join_gameserver_timeout"
            defaultLabel={durationUnit.label(
              configuration.getDefault('games.join_gameserver_timeout'),
            )}
            description="How long a player has to join the gameserver before they are subbed automatically. Use 0 to disable."
          >
            <DurationInput
              id="joinGameserverTimeout"
              name="joinGameserverTimeout"
              valueMs={joinGameServerTimeout}
              units={connectUnits}
            />
          </SettingRow>

          <SettingRow
            label="Rejoin gameserver timeout"
            for="rejoinGameserverTimeout"
            configKey="games.rejoin_gameserver_timeout"
            defaultLabel={durationUnit.label(
              configuration.getDefault('games.rejoin_gameserver_timeout'),
            )}
            description="How long a player has to come back after they go offline during the match. Use 0 to disable."
          >
            <DurationInput
              id="rejoinGameserverTimeout"
              name="rejoinGameserverTimeout"
              valueMs={rejoinGameServerTimeout}
              units={connectUnits}
            />
          </SettingRow>
        </SettingCard>

        <SettingCard title="Server commands">
          <SettingRow
            label="Execute extra commands"
            for="executeExtraCommands"
            configKey="games.execute_extra_commands"
            description="Extra commands to execute on the gameserver before the match starts. One command per line."
          >
            <textarea rows="3" id="executeExtraCommands" name="executeExtraCommands">
              {safeExecuteExtraCommands}
            </textarea>
          </SettingRow>

          <SettingRow
            label="logs.tf upload method"
            for="logsTfUploadMethod"
            configKey="games.logs_tf_upload_method"
          >
            <select name="logsTfUploadMethod" id="logsTfUploadMethod">
              <option value="off" selected={logsTfUploadMethod === LogsTfUploadMethod.off}>
                Off - no logs will be uploaded to logs.tf
              </option>
              <option value="backend" selected={logsTfUploadMethod === LogsTfUploadMethod.backend}>
                Backend - logs will be uploaded by the tf2pickup.org server only
              </option>
              <option
                value="gameserver"
                selected={logsTfUploadMethod === LogsTfUploadMethod.gameserver}
              >
                Gameserver - logs will be uploaded by the logs.tf sourcemod plugin
              </option>
            </select>
          </SettingRow>

          <details class="pb-4">
            <summary class="cursor-pointer py-2 text-sm text-zinc-200">
              Preview: game server startup commands
            </summary>
            <GameServerCommandPreview
              whitelistId={whitelistId}
              executeExtraCommands={executeExtraCommands}
              logsTfUploadMethod={logsTfUploadMethod}
            />
            <p class="mt-2 text-sm text-zinc-400">
              Commands executed on the game server when a game starts, in order. Reflects the saved
              configuration above.
            </p>
          </details>
        </SettingCard>

        <SettingCard
          title="Cooldown bans"
          description="When a player is subbed out of a game, they receive a ban. The ban length grows with each offence, following the levels below."
        >
          <SettingRow
            label="Cooldown levels"
            configKey="games.cooldown_levels"
            description="Levels are applied top to bottom; a player past the last level always gets the last ban length."
          >
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
          </SettingRow>

          <SettingRow
            label="Cooldown level decay"
            for="cooldownDecayPeriod"
            configKey="games.cooldown_decay_period"
            defaultLabel={durationUnit.label(
              configuration.getDefault('games.cooldown_decay_period'),
            )}
            description="Every period without a new offence, a player's cooldown level drops by one, so old offences stop counting. Use 0 to disable decay."
          >
            <DurationInput
              id="cooldownDecayPeriod"
              name="cooldownDecayPeriod"
              valueMs={cooldownDecayPeriod}
            />
          </SettingRow>
        </SettingCard>

        <SaveBar />
      </form>
    </Admin>
  )
}

const connectUnits = ['seconds', 'minutes'] as const

export function CooldownLevelEntry(props: { banLengthMs: number }) {
  const { value, unit } = durationUnit.split(props.banLengthMs)

  return (
    <div class="cooldown-level-row flex flex-row items-center gap-2">
      <span class="cooldown-level-index w-6 shrink-0 text-end text-zinc-200 tabular-nums" />
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
        class="shrink-0 text-zinc-200 hover:text-white"
        aria-label="Remove level"
        data-remove-closest=".cooldown-level-row"
      >
        <IconMinus />
      </button>
    </div>
  )
}
