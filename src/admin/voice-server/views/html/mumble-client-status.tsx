import { IconCheck, IconX } from '../../../../html/components/icons'
import { logger } from '../../../../logger'
import { mumble } from '../../../../mumble'
import { MumbleClientStatus as Status } from '../../../../mumble/status'

type Privileges = NonNullable<Awaited<ReturnType<typeof mumble.getPrivileges>>>

const privilegesDocsUrl = 'https://docs.tf2pickup.org/docs/mumble-verification'

const privilegeRows: { key: keyof Privileges; name: string; acl: string; reason: string }[] = [
  {
    key: 'enter',
    name: 'Enter the games channel',
    acl: 'Enter',
    reason: 'The bot sits in the games channel and manages everything under it.',
  },
  {
    key: 'makeChannel',
    name: 'Create channels',
    acl: 'Make channel',
    reason: 'Creates a channel for every game, with BLU and RED channels inside it.',
  },
  {
    key: 'write',
    name: 'Edit channel permissions',
    acl: 'Write ACL',
    reason:
      "Lets only a game's players into their team channel, and keeps the admin group up to date.",
  },
  {
    key: 'move',
    name: 'Move users',
    acl: 'Move',
    reason: 'Moves verified players into their team channel, and replaced players out of it.',
  },
  {
    key: 'textMessage',
    name: 'Send text messages',
    acl: 'Text message',
    reason: 'Sends players their verification instructions.',
  },
  {
    key: 'register',
    name: 'Register users',
    acl: 'Register User, on the root channel',
    reason: 'Registers admins so they can enter any game channel.',
  },
  {
    key: 'ban',
    name: 'See IP addresses',
    acl: 'Ban, on the root channel',
    reason:
      "Mumble only shows IP addresses to users who can ban. The bot compares them with the game server's to verify players automatically. It never bans anyone.",
  },
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
    <section class="mt-6 flex max-w-prose flex-col gap-4" id="mumble-privileges">
      <div>
        <h4 class="font-bold">Bot privileges</h4>
        <p class="text-abru-light-75">
          Automatic player verification needs the bot to have these privileges on the Mumble server.{' '}
          <a href={privilegesDocsUrl} target="_blank" class="underline">
            How to grant them
          </a>
        </p>
      </div>

      <ul class="flex flex-col gap-3">
        {privilegeRows.map(({ key, name, acl, reason }) => (
          <li class="flex flex-row gap-3">
            {privileges[key] ? (
              <IconCheck class="shrink-0 text-green-600" />
            ) : (
              <IconX class="shrink-0 text-red-600" />
            )}
            <div class="flex flex-col">
              <span class="font-medium">
                <span safe>{name}</span>
                <span class="sr-only">{privileges[key] ? ': granted' : ': missing'}</span>{' '}
                <code class="text-abru-light-75 text-sm" safe>
                  {acl}
                </code>
              </span>
              <span class="text-abru-light-75" safe>
                {reason}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div class="flex flex-col">
        <h4 class="font-bold">Message rate limits</h4>
        <p class="text-abru-light-75">
          By default Mumble drops a client's messages after a burst of 5, then allows 1 per second,
          which makes the bot's permission updates time out. Raise the limits in the server config,
          for example <code>messageburst=50</code> and <code>messagelimit=10</code>. The bot can't
          read these settings, so check them yourself.
        </p>
      </div>
    </section>
  )
}
