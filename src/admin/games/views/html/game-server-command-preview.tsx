import { Html } from '@kitajs/html'
import { environment } from '../../../../environment'
import { LogsTfUploadMethod } from '../../../../shared/types/logs-tf-upload-method'

// keep in sync with compileConfig() in src/games/rcon/configure.ts
export function GameServerCommandPreview(props: {
  whitelistId: string | null
  executeExtraCommands: string[]
  logsTfUploadMethod: LogsTfUploadMethod
}) {
  return (
    <div class="bg-abru-dark-25 flex flex-col overflow-x-auto rounded-lg p-4 font-mono text-sm whitespace-nowrap text-white">
      <span safe>
        logaddress_add {environment.LOG_RELAY_ADDRESS}:{environment.LOG_RELAY_PORT}
      </span>
      <span>kickall</span>
      <span>
        changelevel <Placeholder text="map" />{' '}
        <Comment text="skipped on serveme.tf servers - they start with the right map" />
      </span>
      <span>
        exec <Placeholder text="map config" />{' '}
        <Comment text="only if the map has a config assigned" />
      </span>
      {props.whitelistId ? (
        <span safe>tftrue_whitelist_id {props.whitelistId}</span>
      ) : (
        <span class="italic opacity-40">
          <Comment text="tftrue_whitelist_id skipped - no whitelist ID set" />
        </span>
      )}
      <span>
        sv_password <Placeholder text="generated password" />
      </span>
      <span>
        sm_game_player_add <Placeholder text="steamId" /> -name <Placeholder text="name" /> -team{' '}
        <Placeholder text="team" /> -class <Placeholder text="class" />{' '}
        <Comment text="one line per player" />
      </span>
      <span>sm_game_player_whitelist 1</span>
      <span>
        logstf_title {Html.escapeHtml(environment.WEBSITE_NAME)} #
        <Placeholder text="game number" />
      </span>
      <span>
        logstf_autoupload {props.logsTfUploadMethod === LogsTfUploadMethod.gameserver ? '2' : '0'}
      </span>
      {props.executeExtraCommands
        .filter(command => command.length > 0)
        .map(command => (
          <span safe>{command}</span>
        ))}
    </div>
  )
}

function Placeholder(props: { text: string }) {
  return (
    <span class="text-abru-light-75 italic" safe>
      {`<${props.text}>`}
    </span>
  )
}

function Comment(props: { text: string }) {
  return <span class="text-abru-light-75/60 italic" safe>{`// ${props.text}`}</span>
}
