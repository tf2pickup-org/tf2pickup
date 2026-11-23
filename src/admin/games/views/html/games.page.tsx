import { configuration } from '../../../../configuration'
import { LogsTfUploadMethod } from '../../../../shared/types/logs-tf-upload-method'
import { Admin } from '../../../views/html/admin'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'
import { GameServerCommandPreview } from './game-server-command-preview'

const logsTfUploadMethods: { method: LogsTfUploadMethod; label: string; description: string }[] = [
  { method: LogsTfUploadMethod.off, label: 'Off', description: 'No logs are uploaded to logs.tf.' },
  {
    method: LogsTfUploadMethod.backend,
    label: 'tf2pickup.org uploads',
    description: 'Logs are uploaded by this server. Recommended.',
  },
  {
    method: LogsTfUploadMethod.gameserver,
    label: 'Game server uploads',
    description: 'Logs are uploaded by the logs.tf SourceMod plugin on the game server.',
  },
]

export async function GamesPage() {
  const [whitelistId, executeExtraCommands, logsTfUploadMethod] = await Promise.all([
    configuration.get('games.whitelist_id'),
    configuration.get('games.execute_extra_commands'),
    configuration.get('games.logs_tf_upload_method'),
  ])

  return (
    <Admin activePage="games">
      <form action="/admin/games" method="post" class="flex flex-col gap-4" data-save-bar>
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

        <SettingCard title="Commands">
          <SettingRow
            label="Execute extra commands"
            for="executeExtraCommands"
            configKey="games.execute_extra_commands"
            description="Run over RCON on the game server before the match starts. One command per line."
          >
            <textarea rows="3" id="executeExtraCommands" name="executeExtraCommands" safe>
              {executeExtraCommands.join('\n')}
            </textarea>
          </SettingRow>

          <SettingRow label="logs.tf upload method" configKey="games.logs_tf_upload_method">
            <fieldset class="flex flex-col gap-2">
              <legend class="sr-only">logs.tf upload method</legend>
              {logsTfUploadMethods.map(({ method, label, description }) => (
                <label class="flex flex-row items-start gap-2">
                  <input
                    type="radio"
                    name="logsTfUploadMethod"
                    value={method}
                    checked={method === logsTfUploadMethod}
                    class="mt-1"
                  />
                  <span>
                    <span class="text-white" safe>
                      {label}
                    </span>
                    <span class="block text-sm text-zinc-400" safe>
                      {description}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
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

        <SaveBar />
      </form>
    </Admin>
  )
}
