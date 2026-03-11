import { collections } from '../../../../database/collections'
import type { StaticGameServerModel } from '../../../../database/models/static-game-server.model'
import { IconCheck, IconMinus, IconSquareXFilled, IconX } from '../../../../html/components/icons'

export async function StaticGameServerList() {
  const staticGameServers = await collections.staticGameServers
    .find()
    .sort({ isOnline: -1, lastHeartbeatAt: -1, priority: -1 })
    .limit(10)
    .toArray()

  return (
    <table class="w-full table-fixed" id="admin-panel-static-game-server-list">
      <thead>
        <tr>
          <th class="border-ash/50 w-[15%] border-b pb-3 text-left">Name</th>
          <th class="border-ash/50 w-[22%] border-b pb-3 text-left">IP address</th>
          <th class="border-ash/50 w-[22%] border-b pb-3 text-left">Internal IP address</th>
          <th class="border-ash/50 w-[18%] border-b pb-3 text-left">RCON password</th>
          <th class="border-ash/50 w-[8%] border-b pb-3 text-left">Online</th>
          <th class="border-ash/50 border-b pb-3 text-left">Assigned to game</th>
          <th class="border-ash/50 border-b pb-3 text-left">Health</th>
        </tr>
      </thead>

      <tbody>
        {staticGameServers.map(gameServer => (
          <StaticGameServerItem gameServer={gameServer} />
        ))}
      </tbody>
    </table>
  )
}

function StaticGameServerItem(props: { gameServer: StaticGameServerModel }) {
  const isFree = props.gameServer.isOnline && props.gameServer.game === undefined
  const modalId = `healthcheck-modal-${props.gameServer.id}`

  return (
    <>
      <tr>
        <td class="border-ash/20 truncate overflow-hidden border-b py-4 font-bold" safe>
          {props.gameServer.name}
        </td>
        <td class="border-ash/20 truncate overflow-hidden border-b py-4" safe>
          {props.gameServer.address}:{props.gameServer.port}
        </td>
        <td class="border-ash/20 truncate overflow-hidden border-b py-4" safe>
          {props.gameServer.internalIpAddress}:{props.gameServer.port}
        </td>
        <td class="border-ash/20 border-b py-4" safe>
          {props.gameServer.rconPassword}
        </td>
        <td class="border-ash/20 border-b py-4">
          {props.gameServer.isOnline ? (
            <IconCheck class="text-green-600" />
          ) : (
            <IconX class="text-red-600" />
          )}
        </td>
        <td class="border-ash/20 border-b py-4">
          {props.gameServer.game ? (
            <div class="flex flex-row gap-2 align-middle">
              <a href={`/games/${props.gameServer.game}`} safe>
                #{props.gameServer.game}
              </a>
              <button hx-delete={`/static-game-servers/${props.gameServer.id}/game`}>
                <span class="sr-only">Remove game assignment</span>
                <IconSquareXFilled />
              </button>
            </div>
          ) : (
            <IconMinus />
          )}
        </td>
        <td class="border-ash/20 border-b py-4">
          {isFree ? (
            <button
              class="rounded border border-white/20 bg-white/[0.08] px-2.5 py-0.5 text-xs text-white/80 hover:bg-white/[0.15]"
              hx-post={`/admin/game-servers/${props.gameServer.id}/healthcheck`}
              hx-target={`#${modalId}`}
              hx-swap="innerHTML"
            >
              Check
            </button>
          ) : (
            <button
              class="rounded border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-xs text-white/20"
              disabled
            >
              Check
            </button>
          )}
        </td>
      </tr>
      <tr>
        <td colspan="7">
          <div id={modalId} />
        </td>
      </tr>
    </>
  )
}
