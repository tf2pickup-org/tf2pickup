import { discord } from '../../../../discord'

export function SelectDiscordGuild(
  props: {
    current?: string | null
  } & JSX.HtmlSelectTag,
) {
  const { current, ...rest } = props
  const guilds = Array.from(discord.client?.guilds.cache.values() ?? []).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  )

  if (guilds.length === 0) {
    return (
      <select {...rest} disabled>
        <option value="">no guilds available</option>
        {current && (
          <option value={current} selected>
            {current}
          </option>
        )}
      </select>
    )
  }

  return (
    <select {...rest}>
      <option value="">disabled</option>

      {guilds.map(({ id, name }) => (
        <option value={id} selected={current === id} safe>
          {name}
        </option>
      ))}
    </select>
  )
}
