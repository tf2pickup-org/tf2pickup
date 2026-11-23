import { configuration } from '../../../../configuration'
import { discord } from '../../../../discord'
import { Admin } from '../../../views/html/admin'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'
import { DiscordConfiguration } from './discord-configuration'

export async function DiscordPage() {
  const discordInviteLink = await configuration.get('misc.discord_invite_link')

  return (
    <Admin activePage="discord">
      <div class="flex flex-col gap-4">
        <form action="/admin/discord" method="post" class="flex flex-col gap-4" data-save-bar>
          <SettingCard title="Community server">
            <SettingRow
              label="Discord invite link"
              for="discord-invite-link"
              configKey="misc.discord_invite_link"
              description="Shown to players across the site so they can join your Discord server."
            >
              <input
                type="url"
                id="discord-invite-link"
                name="discordInviteLink"
                value={discordInviteLink ?? ''}
                placeholder="https://discord.gg/..."
              />
            </SettingRow>
          </SettingCard>
          <SaveBar />
        </form>

        <SettingCard
          title="Bot"
          description={
            discord.client?.isReady()
              ? 'Pick the channels the bot posts to, for each server it is in.'
              : 'Not configured. Set DISCORD_BOT_TOKEN in the environment to enable it.'
          }
        >
          {discord.client?.isReady() && (
            <div class="py-4">
              <DiscordConfiguration client={discord.client} />
            </div>
          )}
        </SettingCard>
      </div>
    </Admin>
  )
}
