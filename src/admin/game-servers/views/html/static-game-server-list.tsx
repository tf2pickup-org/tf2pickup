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
          <th class="border-ash/50 border-b pb-3 text-left w-[15%]">Name</th>
          <th class="border-ash/50 border-b pb-3 text-left w-[22%]">IP address</th>
          <th class="border-ash/50 border-b pb-3 text-left w-[22%]">Internal IP address</th>
          <th class="border-ash/50 border-b pb-3 text-left w-[18%]">RCON password</th>
          <th class="border-ash/50 border-b pb-3 text-left w-[8%]">Online</th>
          <th class="border-ash/50 border-b pb-3 text-left">Assigned to game</th>
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
  return (
    <tr>
      <td class="border-ash/20 border-b py-4 font-bold truncate overflow-hidden" safe>
        {props.gameServer.name}
      </td>
      <td class="border-ash/20 border-b py-4 truncate overflow-hidden" safe>
        {props.gameServer.address}:{props.gameServer.port}
      </td>
      <td class="border-ash/20 border-b py-4 truncate overflow-hidden" safe>
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
    </tr>
  )
}
