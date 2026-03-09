import { ChannelType, TextChannel, VoiceChannel } from 'discord.js'
import { discord } from '../../../../discord'

type DiscordChannelType = 'text' | 'voice' | 'category'

export function SelectDiscordChannel(
  props: {
    guildId?: string | null
    current?: string
    channelType: DiscordChannelType
  } & JSX.HtmlSelectTag,
) {
  const { guildId, current, channelType, ...rest } = props
  const guild = guildId ? discord.client?.guilds.resolve(guildId) : null

  if (!guild) {
    return (
      <select {...rest} disabled>
        <option value="">{guildId ? 'guild not found' : 'select guild first'}</option>
        {current && (
          <option value={current} selected>
            {current}
          </option>
        )}
      </select>
    )
  }

  if (channelType === 'category') {
    const categories = Array.from(guild.channels.cache.values())
      .filter(channel => channel.type === ChannelType.GuildCategory)
      .toSorted((a, b) => a.position - b.position)

    return (
      <select {...rest}>
        <option value="">disabled</option>

        {categories.map(({ id, name }) => (
          <option value={id} selected={current === id} safe>
            {name}
          </option>
        ))}
      </select>
    )
  }

  const channels = Array.from(guild.channels.cache.values()).filter(channel =>
    channelType === 'text' ? channel instanceof TextChannel : channel instanceof VoiceChannel,
  )

  const groupedChannels = channels.reduce<Map<string, typeof channels>>((prev, curr) => {
    const parentName = curr.parent?.name ?? 'No category'
    if (!prev.has(parentName)) {
      prev.set(parentName, [])
    }

    prev.get(parentName)!.push(curr)
    return prev
  }, new Map<string, typeof channels>())

  groupedChannels.forEach(group => group.sort((a, b) => a.position - b.position))

  return (
    <select {...rest}>
      <option value="">disabled</option>

      {Array.from(groupedChannels, ([parent, grouped]) => (
        <optgroup label={parent}>
          {grouped.map(({ id, name }) => (
            <option value={id} selected={current === id} safe>
              {name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
