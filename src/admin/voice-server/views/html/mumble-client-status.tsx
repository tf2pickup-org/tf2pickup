import { IconCheck, IconX } from '../../../../html/components/icons'
import { logger } from '../../../../logger'
import { mumble } from '../../../../mumble'
import { MumbleClientStatus as Status } from '../../../../mumble/status'

type Privileges = NonNullable<Awaited<ReturnType<typeof mumble.getPrivileges>>>

// shown only while the player verification switch on the voice server page is on
const visibleWithVerification =
  'hidden group-has-[#mumble-player-verification:checked]/voice-server:flex'

const privilegesDocsUrl = 'https://docs.tf2pickup.org/docs/mumble-verification'

const privilegeRows: {
  key: keyof Privileges
  name: string
  reason: string
  permission?: string
  channel?: 'games' | 'root'
  verificationOnly?: true
}[] = [
  {
    key: 'enter',
    name: 'Join the games channel',
    reason: 'The bot sits in the games channel and manages everything under it.',
    permission: 'Enter',
    channel: 'games',
  },
  {
    key: 'makeChannel',
    name: 'Create channels',
    reason: 'Creates a channel for every game, with BLU and RED channels inside it.',
    permission: 'Make channel',
    channel: 'games',
  },
  {
    key: 'write',
    name: 'Manage game channels',
    reason:
      "Lets only a game's players into their team channel, moves them in and out of it, and messages them their verification instructions.",
    permission: 'Write ACL',
    channel: 'games',
    verificationOnly: true,
  },
  {
    key: 'move',
    name: 'Move players into their team channel',
    reason:
      "When a player gets verified, they're usually waiting in another channel. Mumble only lets the bot move them from a channel where it has Move.",
    permission: 'Move',
    channel: 'root',
    verificationOnly: true,
  },
  {
    key: 'register',
    name: 'Register admins',
    reason: 'Registers site admins on Mumble so they can enter any game channel.',
    permission: 'Register User',
    channel: 'root',
    verificationOnly: true,
  },
  {
    key: 'ban',
    name: "See players' IP addresses",
    reason:
      "Mumble only shows IP addresses to users who are allowed to ban. The bot compares them with the game server's to verify players automatically. It never bans anyone.",
    permission: 'Ban',
    channel: 'root',
    verificationOnly: true,
  },
  {
    key: 'gamesRootAcl',
    name: 'Keep players out of other games',
    reason:
      "The bot's entries on the games channel: nobody but site admins can enter game channels, except each game's own players. The bot adds them when you save with the switch on, and removes them when you turn it off.",
    verificationOnly: true,
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
        <h4 class="font-bold text-zinc-100">What the bot is allowed to do</h4>
        <p>
          The bot needs these permissions on the Mumble server. The games channel is the one set in{' '}
          <em>Channel name</em> above. Write ACL on a channel grants every other permission on it,
          too.{' '}
          <a href={privilegesDocsUrl} target="_blank" class="underline">
            How to grant permissions in Mumble
          </a>
        </p>
      </div>

      <ul class="flex flex-col gap-4">
        {privilegeRows.map(({ key, name, reason, permission, channel, verificationOnly }) => (
          <li class={['flex-row gap-3', verificationOnly ? visibleWithVerification : 'flex']}>
            {privileges[key] ? (
              <IconCheck class="shrink-0 text-green-600" />
            ) : (
              <IconX class="shrink-0 text-red-600" />
            )}
            <div class="flex flex-col">
              <span class="font-medium text-zinc-100">
                <span safe>{name}</span>
                <span class="sr-only">{privileges[key] ? ': allowed' : ': not allowed'}</span>
              </span>
              <span safe>{reason}</span>
              {!!permission && (
                <span class="text-sm">
                  Mumble permission: <strong safe>{permission}</strong>{' '}
                  {channel === 'games' ? 'on the games channel' : 'on the root channel'}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div class={['flex-col', visibleWithVerification]}>
        <h4 class="font-bold text-zinc-100">Message rate limits</h4>
        <p>
          By default Mumble ignores a client's messages after a burst of 5, then allows 1 per
          second, which makes the bot's permission updates time out. Raise the limits in the server
          config, for example <code>messageburst=50</code> and <code>messagelimit=10</code>. The bot
          can't read these settings, so check them yourself.
        </p>
      </div>
    </section>
  )
}
