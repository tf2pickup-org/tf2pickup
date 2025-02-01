import type { User } from '../../../../auth/types/user'
import { Admin } from '../../../views/html/admin'
import { DiscordConfiguration } from './discord-configuration'
import { IconX } from '../../../../html/components/icons'
import { discord } from '../../../../discord'

export function DiscordPage(props: { user: User }) {
  return (
    <Admin activePage="discord" user={props.user}>
      <div class="admin-panel-set">
        {discord.client?.isReady() ? (
          <DiscordConfiguration client={discord.client} />
        ) : (
          <>
            <h4>
              <span class="flex flex-row text-red-600">
                <IconX />
                disabled
              </span>
            </h4>
            <span>
              In order to enable discord integration you have to provide the{' '}
              <code>DISCORD_BOT_TOKEN</code> environment variable.
            </span>
          </>
        )}
      </div>
    </Admin>
  )
}
