import type { ServerOption } from '@tf2pickup-org/serveme-tf-client'
import { IconLoader3 } from '../../../html/components/icons'
import getUnicodeFlagIcon from 'country-flag-icons/unicode'

export async function ServemeTfServerList(props: { servers?: ServerOption[] }) {
  if (props.servers) {
    const groupedServers = props.servers.reduce<Record<string, ServerOption[]>>((acc, server) => {
      const match = /^(.*?) #/.exec(server.name)
      if (!match) {
        return acc
      }

      const groupName = match[1]!
      acc[groupName] ??= []
      acc[groupName].push(server)
      return acc
    }, {})

    return (
      <ul>
        {Object.entries(groupedServers).map(([groupName, servers]) => (
          <li>
            <label class="flex flex-row gap-2">
              <input type="radio" name="gameServer" value={`servemeTf:anyOf:${groupName}`} />
              <span safe>{getUnicodeFlagIcon(servers[0]!.flag)}</span>
              <span safe>{groupName}</span>
            </label>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      <p class="my-2">serveme.tf</p>
      <div
        class="flex flex-row gap-2"
        hx-get="/serveme-tf/list-servers"
        hx-target="this"
        hx-swap="outerHTML"
        hx-trigger="open from:#choose-game-server-dialog"
      >
        <IconLoader3 class="animate-spin" />
        <span>Loading...</span>
      </div>
    </>
  )
}
