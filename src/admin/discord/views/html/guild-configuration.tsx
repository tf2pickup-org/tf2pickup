import { TextChannel, type Guild } from 'discord.js'
import { SaveButton } from '../../../views/html/save-button'
import { configuration } from '../../../../configuration'
import { environment } from '../../../../environment'

export async function GuildConfiguration(props: { guild: Guild; enabled: boolean }) {
  if (!props.enabled) {
    return <></>
  }

  const [guildConfig, agentChannels] = await Promise.all([
    configuration
      .get('discord.guilds')
      .then(guilds => guilds.find(({ id }) => id === props.guild.id)),
    configuration.get('agent.channels'),
  ])

  const enabledAgentChannelIds = new Set(
    agentChannels.filter(c => c.guildId === props.guild.id).map(c => c.channelId),
  )
  const agentEnabled = !!environment.ANTHROPIC_API_KEY

  return (
    <form action={`/admin/discord/${props.guild.id}`} method="post" class="flex flex-col gap-2">
      <div class="flex flex-row gap-2">
        <label for={`${props.guild.id}-admin-notifications-channel`}>
          Admin notifications channel:
        </label>
        <SelectTextChannel
          guild={props.guild}
          id={`${props.guild.id}-admin-notifications-channel`}
          name="adminNotificationsChannel"
          current={guildConfig?.adminNotifications?.channel}
        />
      </div>

      <div class="flex flex-row gap-2">
        <label for={`${props.guild.id}-substitute-notifications-channel`}>
          Substitute notifications channel:
        </label>
        <SelectTextChannel
          guild={props.guild}
          id={`${props.guild.id}-substitute-notifications-channel`}
          name="substituteNotificationsChannel"
          current={guildConfig?.substituteNotifications?.channel}
        />
        <label for={`${props.guild.id}-substitute-notifications-mention-role`}>mention role:</label>
        <SelectRole
          guild={props.guild}
          id={`${props.guild.id}-substitute-notifications-mention-role`}
          name="substituteNotificationsMentionRole"
          current={guildConfig?.substituteNotifications?.role}
        />
      </div>

      <div class="flex flex-row gap-2">
        <label for={`${props.guild.id}-queue-prompts-channel`}>Queue prompts channel:</label>
        <SelectTextChannel
          guild={props.guild}
          id={`${props.guild.id}-queue-prompts-channel`}
          name="queuePromptsChannel"
          current={guildConfig?.queuePrompts?.channel}
        />
      </div>

      <fieldset
        disabled={!agentEnabled || undefined}
        class={['flex flex-col gap-1', !agentEnabled && 'opacity-50']}
      >
        <label for={`${props.guild.id}-agent-channels`}>Agent channels:</label>
        <SelectAgentChannels
          guild={props.guild}
          id={`${props.guild.id}-agent-channels`}
          name="agentChannels"
          current={enabledAgentChannelIds}
        />
        <span class="text-abru-light-75 text-xs">
          {agentEnabled
            ? 'Hold Ctrl / Cmd to select multiple channels.'
            : 'Set ANTHROPIC_API_KEY to enable the agent.'}
        </span>
      </fieldset>

      <p>
        <SaveButton hx-disabled-elt="this" />
      </p>
    </form>
  )
}

function SelectTextChannel(
  props: { guild: Guild; current: string | undefined } & JSX.HtmlSelectTag,
) {
  const { guild, current, ...rest } = props
  const textChannels = Array.from(
    guild.channels.cache.filter(channel => channel instanceof TextChannel).values(),
  ).reduce<Map<string, TextChannel[]>>((prev, curr) => {
    if (!prev.has(curr.parent!.name)) {
      prev.set(curr.parent!.name, [])
    }

    prev.get(curr.parent!.name)!.push(curr)
    return prev
  }, new Map<string, TextChannel[]>())

  textChannels.forEach(value => value.sort((a, b) => a.position - b.position))

  return (
    <select {...rest}>
      <option value="">disabled</option>

      {Array.from(textChannels, ([parent, channels]) => (
        <optgroup label={parent}>
          {channels.map(({ id, name }) => (
            <option value={id} selected={current === id} safe>
              {name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

function SelectAgentChannels(props: { guild: Guild; current: Set<string> } & JSX.HtmlSelectTag) {
  const { guild, current, ...rest } = props
  const byCategory = Array.from(
    guild.channels.cache.filter(channel => channel instanceof TextChannel).values(),
  ).reduce<Map<string, TextChannel[]>>((acc, channel) => {
    const category = channel.parent?.name ?? 'Uncategorized'
    if (!acc.has(category)) acc.set(category, [])
    acc.get(category)!.push(channel)
    return acc
  }, new Map())

  byCategory.forEach(channels => channels.sort((a, b) => a.position - b.position))

  return (
    <select multiple="" size="8" {...rest}>
      {Array.from(byCategory, ([category, channels]) => (
        <optgroup label={category}>
          {channels.map(({ id, name }) => (
            <option value={id} selected={current.has(id)} safe>
              #{name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
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
