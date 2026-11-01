import { IconCheck, IconX } from '../../../../html/components/icons'
import { logger } from '../../../../logger'
import { mumble } from '../../../../mumble'
import { MumbleClientStatus as Status } from '../../../../mumble/status'

type Privileges = NonNullable<Awaited<ReturnType<typeof mumble.getPrivileges>>>

const privilegeRows: { key: keyof Privileges; name: string; enables: string }[] = [
  { key: 'enter', name: 'Enter the games channel', enables: 'joining the games channel' },
  { key: 'makeChannel', name: 'Make channel', enables: 'game and team channels' },
  { key: 'write', name: 'Write', enables: 'channel ACLs and the admin group' },
  { key: 'move', name: 'Move', enables: 'moving verified players in and substitutes out' },
  { key: 'textMessage', name: 'Text message', enables: 'verification codes and notices' },
  { key: 'register', name: 'Register (server root)', enables: 'registering admins' },
  { key: 'ban', name: 'Ban (server root)', enables: 'reading client IP addresses' },
]

export async function MumbleClientStatus() {
  let status = <></>
  switch (mumble.getStatus()) {
    case Status.disconnected:
      status = <span class="text-gray-700">disconnected</span>
      break
    case Status.connecting:
      status = <span class="text-yellow-600">connecting...</span>
      break
    case Status.connected:
      status = <span class="text-green-500">connected</span>
      break
    case Status.error:
      status = <span class="text-red-600">error</span>
      break
  }

  return (
    <div id="mumble-client-status-indicator" class="my-2">
      {status}
      {mumble.getStatus() === Status.connected && <PrivilegeChecklist />}
    </div>
  )
}

async function PrivilegeChecklist() {
  let privileges: Privileges | undefined
  try {
    privileges = await mumble.getPrivileges()
  } catch (error) {
    logger.warn(error, 'could not query mumble privileges')
  }

  if (!privileges) {
    return <p class="text-red-600">Could not check the bot's privileges</p>
  }

  return (
    <ul class="mt-4 flex flex-col gap-1" id="mumble-privileges">
      {privilegeRows.map(({ key, name, enables }) => (
        <li class="flex flex-row items-center gap-2">
          {privileges[key] ? <IconCheck class="text-green-600" /> : <IconX class="text-red-600" />}
          <span class="sr-only">{privileges[key] ? 'granted' : 'missing'}</span>
          <span class="font-medium" safe>
            {name}
          </span>
          <span class="text-abru-light-75" safe>
            {enables}
          </span>
        </li>
      ))}
      <li class="flex flex-row items-center gap-2 pl-8">
        <span class="font-medium">Message rate limits raised</span>
        <span class="text-abru-light-75">
          the bot can't check this; set <code>messageburst=50</code> and{' '}
          <code>messagelimit=10</code> in the server config so ACL updates don't time out
        </span>
      </li>
    </ul>
  )
}
