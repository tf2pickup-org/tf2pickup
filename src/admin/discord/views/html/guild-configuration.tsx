import { type Guild } from 'discord.js'
import { SaveButton } from '../../../views/html/save-button'
import { configuration } from '../../../../configuration'
import { SelectDiscordChannel } from './select-discord-channel'

export async function GuildConfiguration(props: { guild: Guild; enabled: boolean }) {
  if (!props.enabled) {
    return <></>
  }

  const config = (await configuration.get('discord.guilds')).find(({ id }) => id === props.guild.id)

  return (
    <form action={`/admin/discord/${props.guild.id}`} method="post" class="flex flex-col gap-2">
      <div class="flex flex-row gap-2">
        <label for={`${props.guild.id}-admin-notifications-channel`}>
          Admin notifications channel:
        </label>
        <SelectDiscordChannel
          guildId={props.guild.id}
          channelType="text"
          id={`${props.guild.id}-admin-notifications-channel`}
          name="adminNotificationsChannel"
          current={config?.adminNotifications?.channel}
        />
      </div>

      <div class="flex flex-row gap-2">
        <label for={`${props.guild.id}-substitute-notifications-channel`}>
          Substitute notifications channel:
        </label>
        <SelectDiscordChannel
          guildId={props.guild.id}
          channelType="text"
          id={`${props.guild.id}-substitute-notifications-channel`}
          name="substituteNotificationsChannel"
          current={config?.substituteNotifications?.channel}
        />
        <label for={`${props.guild.id}-substitute-notifications-mention-role`}>mention role:</label>
        <SelectRole
          guild={props.guild}
          id={`${props.guild.id}-substitute-notifications-mention-role`}
          name="substituteNotificationsMentionRole"
          current={config?.substituteNotifications?.role}
        />
      </div>

      <div class="flex flex-row gap-2">
        <label for={`${props.guild.id}-queue-prompts-channel`}>Queue prompts channel:</label>
        <SelectDiscordChannel
          guildId={props.guild.id}
          channelType="text"
          id={`${props.guild.id}-queue-prompts-channel`}
          name="queuePromptsChannel"
          current={config?.queuePrompts?.channel}
        />
      </div>

      <p>
        <SaveButton hx-disabled-elt="this" />
      </p>
    </form>
  )
}

function SelectRole(props: { guild: Guild; current: string | undefined } & JSX.HtmlSelectTag) {
  const { guild, current, ...rest } = props
  const roles = Array.from(guild.roles.cache.values()).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  )

  return (
    <select {...rest}>
      <option value="">disabled</option>

      {roles.map(({ name, id }) => (
        <option value={id} selected={current === id} safe>
          {name}
        </option>
      ))}
    </select>
  )
}
