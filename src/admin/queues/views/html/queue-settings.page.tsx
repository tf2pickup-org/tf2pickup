import { millisecondsToSeconds } from 'date-fns'
import type { QueueModel } from '../../../../database/models/queue.model'
import { QueueTabs } from '../../../../html/components/queue-tabs'
import { Switch } from '../../../../html/components/switch'
import { queues } from '../../../../queues'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'

export async function QueueSettingsPage(props: { queue: QueueModel }) {
  const { queue } = props
  const inheritedWhitelistId = await queues.resolveWhitelistId({ ...queue, whitelistId: null })

  return (
    <Admin activePage="queues">
      <QueueTabs
        queues={await queues.list()}
        active={queue.slug}
        href={slug => `/admin/queues/${slug}`}
      />
      <form action="" method="post" id="queueSettingsForm">
        <div class="admin-panel-set flex flex-col gap-4">
          <dl class="text-sm text-zinc-200">
            <dt>Slug</dt>
            <dd safe>{queue.slug}</dd>
            <dt>Gamemode</dt>
            <dd>{queue.gamemode}</dd>
            <dt>Launch mode</dt>
            <dd>{queue.launchMode}</dd>
          </dl>

          <dl>
            <dt>
              <label for="name">Name</label>
            </dt>
            <dd>
              <input type="text" id="name" name="name" value={queue.name} required />
            </dd>
          </dl>

          <div class="group flex flex-row items-center justify-between">
            <dl>
              <dt>
                <label class="text-zinc-200" for="requireVerification">
                  Require player verification
                </label>
              </dt>
              <dd class="text-zinc-200">
                <span class="hidden group-has-checked:inline-block">
                  Players must be manually verified by an admin before they can join this queue
                </span>
                <span class="group-has-checked:hidden">All players can join this queue freely</span>
              </dd>
            </dl>
            <Switch
              id="requireVerification"
              name="requireVerification"
              checked={queue.requireVerification}
            />
          </div>

          <dl>
            <dt class="group flex flex-row gap-2">
              <label for="skillThresholdEnabled">Player skill threshold</label>
              <input
                type="checkbox"
                id="skillThresholdEnabled"
                name="skillThresholdEnabled"
                value="enabled"
                checked={queue.skillThreshold !== null}
              />
              <span class="hidden group-has-checked:inline-block">enabled</span>
              <span class="group-has-checked:hidden">disabled</span>
            </dt>
            <dd class="flex flex-col">
              <div>
                <label for="skillThreshold" class="sr-only">
                  Player skill threshold value
                </label>
                <input
                  type="number"
                  id="skillThreshold"
                  name="skillThreshold"
                  step="any"
                  value={queue.skillThreshold?.toString()}
                  disabled={queue.skillThreshold === null}
                  data-toggle-disabled-form="#queueSettingsForm"
                  data-toggle-disabled-control="skillThresholdEnabled"
                  data-toggle-disabled-checked="true"
                />
              </div>
              <p class="text-sm text-zinc-200">
                Players will be able to join this queue only on classes that meet the given
                criteria.
              </p>
            </dd>
          </dl>

          <SecondsInput
            id="readyUpTimeout"
            label="Ready-up timeout (seconds)"
            value={queue.readyUpTimeout}
            description="Time players have to ready up before they are kicked out of the queue"
          />
          <SecondsInput
            id="readyStateTimeout"
            label="Ready state timeout (seconds)"
            value={queue.readyStateTimeout}
            description="Time the queue stays in the ready-up state before going back to waiting, unless all players ready up"
          />

          <dl>
            <dt>
              <label for="mapCooldown">Map cooldown</label>
            </dt>
            <dd class="flex flex-col">
              <input
                type="number"
                id="mapCooldown"
                name="mapCooldown"
                min="0"
                value={queue.mapCooldown.toString()}
              />
              <p class="text-sm text-zinc-200">
                How many games have to be played before the last map can be voted for again
              </p>
            </dd>
          </dl>

          <dl>
            <dt>
              <label for="whitelistId">Whitelist ID</label>
            </dt>
            <dd class="flex flex-col">
              <input
                type="text"
                id="whitelistId"
                name="whitelistId"
                value={queue.whitelistId ?? ''}
                placeholder={inheritedWhitelistId ?? ''}
              />
              <p class="text-sm text-zinc-200">
                Leave empty to use the gamemode's or the global whitelist
              </p>
            </dd>
          </dl>

          <p>
            <SaveButton />
          </p>
        </div>
      </form>
    </Admin>
  )
}

function SecondsInput(props: { id: string; label: string; value: number; description: string }) {
  return (
    <dl>
      <dt>
        <label for={props.id} safe>
          {props.label}
        </label>
      </dt>
      <dd class="flex flex-col">
        <input
          type="number"
          id={props.id}
          name={props.id}
          min="1"
          value={millisecondsToSeconds(props.value).toString()}
        />
        <p class="text-sm text-zinc-200" safe>
          {props.description}
        </p>
      </dd>
    </dl>
  )
}
