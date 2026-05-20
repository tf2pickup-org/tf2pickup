import { environment } from '../../../../environment'
import { discord } from '../../../../discord'
import { IconCheck, IconX } from '../../../../html/components/icons'

export function AgentStatus() {
  const reasons: string[] = []

  if (!environment.DISCORD_BOT_TOKEN) {
    reasons.push('DISCORD_BOT_TOKEN environment variable is not set')
  } else if (!discord.client?.isReady()) {
    reasons.push('Discord client is not connected')
  }

  if (!environment.ANTHROPIC_API_KEY) {
    reasons.push('ANTHROPIC_API_KEY environment variable is not set')
  }

  const enabled = reasons.length === 0

  return (
    <div class="admin-panel-set">
      <h4>
        {enabled ? (
          <span class="flex flex-row gap-1 text-green-500">
            <IconCheck />
            Agent enabled
          </span>
        ) : (
          <span class="flex flex-row gap-1 text-red-600">
            <IconX />
            Agent disabled
          </span>
        )}
      </h4>
      {!enabled && (
        <ul class="text-abru-light-75 list-disc pl-4 text-sm">
          {reasons.map(reason => (
            <li safe>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
