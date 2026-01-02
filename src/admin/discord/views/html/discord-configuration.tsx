import { type Client, type Guild } from 'discord.js'
import { Switch } from '../../../../html/components/switch'
import { configuration } from '../../../../configuration'
import { GuildConfiguration } from './guild-configuration'

export function DiscordConfiguration(props: { client: Client<true> }) {
  const guilds = props.client.guilds.cache
  return (
    <div class="flex flex-col gap-8">
      {guilds.map(guild => (
        <GuildItem guild={guild} />
      ))}
    </div>
  )
}

async function GuildItem(props: { guild: Guild }) {
  const config = (await configuration.get('discord.guilds')).find(({ id }) => id === props.guild.id)
  const iconUrl = props.guild.iconURL({ size: 64 })
  let icon = <></>
  if (iconUrl) {
    icon = <img src={iconUrl} width="64" height="64" class="h-[40px] w-[40px]" />
  }
  const enabled = !!config
  const containerId = `guild-configuration-${props.guild.id}`

  return (
    <div class="group flex flex-row gap-4">
      {icon}

      <div class="flex grow flex-col gap-2" hx-target={`#${containerId}`}>
        <GuildToggle guild={props.guild} enabled={enabled} />
        <div class="contents" id={containerId}>
          <GuildConfiguration guild={props.guild} enabled={enabled} />
        </div>
      </div>
    </div>
  )
}

async function GuildToggle(props: { guild: Guild; enabled: boolean }) {
  return (
    <div class="flex flex-row">
      <dl class="grow">
        <dt>
          <label class="text-abru-light-75" for={props.guild.id} safe>
            {props.guild.name}
          </label>
        </dt>
        <dd class="text-abru-light-75">
          <span class="hidden group-has-checked:inline-block">Enabled</span>
          <span class="group-has-checked:hidden">Disabled</span>
        </dd>
      </dl>

      <Switch
        id={props.guild.id}
        checked={props.enabled}
        name={props.guild.id}
        hx-put={`/admin/discord/${props.guild.id}/toggle`}
      />
    </div>
  )
}
