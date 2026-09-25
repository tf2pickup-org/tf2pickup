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
    <table class="w-full table-fixed max-lg:min-w-2xl" id="admin-panel-static-game-server-list">
      <thead>
        <tr>
          <th class="w-[15%] border-b border-zinc-100/50 pb-3 text-left">Name</th>
          <th class="w-[22%] border-b border-zinc-100/50 pb-3 text-left">IP address</th>
          <th class="w-[22%] border-b border-zinc-100/50 pb-3 text-left">Internal IP address</th>
          <th class="w-[18%] border-b border-zinc-100/50 pb-3 text-left">RCON password</th>
          <th class="w-[8%] border-b border-zinc-100/50 pb-3 text-left">Online</th>
          <th class="border-b border-zinc-100/50 pb-3 text-left">Assigned to game</th>
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
      <td class="truncate overflow-hidden border-b border-zinc-100/20 py-4 font-bold" safe>
        {props.gameServer.name}
      </td>
      <td class="truncate overflow-hidden border-b border-zinc-100/20 py-4" safe>
        {props.gameServer.address}:{props.gameServer.port}
      </td>
      <td class="truncate overflow-hidden border-b border-zinc-100/20 py-4" safe>
        {props.gameServer.internalIpAddress}:{props.gameServer.port}
      </td>
      <td class="border-b border-zinc-100/20 py-4" safe>
        {props.gameServer.rconPassword}
      </td>
      <td class="border-b border-zinc-100/20 py-4">
        {props.gameServer.isOnline ? (
          <IconCheck class="text-green-600" />
        ) : (
          <IconX class="text-red-600" />
        )}
      </td>
      <td class="border-b border-zinc-100/20 py-4">
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
