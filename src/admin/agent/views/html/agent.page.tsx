import { environment } from '../../../../environment'
import { configuration } from '../../../../configuration'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'
import { Switch } from '../../../../html/components/switch'
import { IconCheck, IconX } from '../../../../html/components/icons'

export async function AgentPage() {
  const enabled = !!environment.ANTHROPIC_API_KEY

  const [skillSupervisor, dailyTokenBudget] = await Promise.all([
    configuration.get('agent.skill_supervisor'),
    configuration.get('agent.daily_token_budget'),
  ])

  return (
    <Admin activePage="agent">
      <div class="admin-panel-set mb-4">
        <h4>
          {enabled ? (
            <span class="flex flex-row gap-1 text-green-500">
              <IconCheck />
              Enabled
            </span>
          ) : (
            <span class="flex flex-row gap-1 text-red-600">
              <IconX />
              Disabled
            </span>
          )}
        </h4>
        {!enabled && (
          <p class="text-abru-light-75 text-sm">
            Set the <code>ANTHROPIC_API_KEY</code> environment variable to enable the AI agent.
          </p>
        )}
      </div>

      <form action="" method="post">
        <div class="admin-panel-set">
          <dl>
            <dt>
              <label for="skill-supervisor" class="font-medium">
                Skill supervisor
              </label>
            </dt>
            <dd>
              <Switch
                id="skill-supervisor"
                name="skillSupervisor"
                value="true"
                checked={skillSupervisor}
              />
            </dd>
            <dd class="text-abru-light-75 text-sm">
              Automatically review and adjust player skills after each game.
            </dd>
          </dl>

          <dl>
            <dt>
              <label for="daily-token-budget" class="font-medium">
                Daily token budget
              </label>
            </dt>
            <dd>
              <input
                type="number"
                id="daily-token-budget"
                name="dailyTokenBudget"
                value={dailyTokenBudget?.toString() ?? ''}
                min="0"
                placeholder="unlimited"
              />
            </dd>
            <dd class="text-abru-light-75 text-sm">
              <p>
                Maximum combined input + output tokens the agent may use per day. Leave empty for
                unlimited.
              </p>
              <p class="mt-1">
                Using{' '}
                <a
                  href="https://platform.claude.com/docs/en/about-claude/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Claude Opus 4.7
                </a>
                : $5/MTok input · $25/MTok output. 10k tokens ≈ $0.05–$0.25 · 1M tokens ≈ $5–$25
                (varies by input/output ratio).
              </p>
            </dd>
          </dl>

          <p class="mt-8">
            <SaveButton />
          </p>
        </div>
      </form>
    </Admin>
  )
}
