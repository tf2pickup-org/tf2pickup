import type { QueueModel } from '../../../../database/models/queue.model'
import { gamemodeConfigs } from '../../../../gamemodes/configs'
import { IconPlus } from '../../../../html/components/icons'
import { Switch } from '../../../../html/components/switch'
import { queues } from '../../../../queues'
import { queueSettingDefault } from '../../../../queues/queue-setting-default'
import { durationUnit } from '../../../games/duration-unit'
import { Admin } from '../../../views/html/admin'
import { DurationInput } from '../../../views/html/duration-input'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'
import { MapPoolEntry } from './map-pool-entry'
import { MapVoteOptions } from './map-vote-options'

type Tab = 'general' | 'maps' | 'timers'

const tabs: { tab: Tab; title: string; path: string }[] = [
  { tab: 'general', title: 'General', path: '' },
  { tab: 'maps', title: 'Maps', path: '/maps' },
  { tab: 'timers', title: 'Timers', path: '/timers' },
]

export async function QueueSettingsPage(props: { queue: QueueModel; tab: Tab }) {
  const { queue } = props
  return (
    <Admin activePage="queues">
      <div class="mb-4 flex flex-col gap-1">
        <p class="text-sm text-zinc-400">
          <a href="/admin/queues" class="underline">
            Queues
          </a>{' '}
          / <span safe>{queue.name}</span>
        </p>
        <h2 class="flex flex-row items-center gap-2 text-xl font-bold text-white">
          <span safe>{queue.name}</span>
          <span
            class={[
              'rounded-sm px-2 py-0.5 text-xs font-semibold',
              queue.enabled ? 'bg-green-900 text-green-100' : 'bg-zinc-700 text-zinc-200',
            ]}
          >
            {queue.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </h2>
        <p class="text-sm text-zinc-400" safe>
          {`${queue.gamemode} · ${queue.launchMode} · slug ${queue.slug}`}
        </p>
      </div>

      <nav class="admin-tabs" aria-label="Queue settings">
        {tabs.map(({ tab, title, path }) => (
          <a
            href={`/admin/queues/${queue.slug}${path}`}
            aria-current={tab === props.tab ? 'page' : undefined}
            safe
          >
            {title}
          </a>
        ))}
      </nav>

      {props.tab === 'general' && <GeneralTab queue={queue} />}
      {props.tab === 'maps' && <MapsTab queue={queue} />}
      {props.tab === 'timers' && <TimersTab queue={queue} />}
    </Admin>
  )
}

async function GeneralTab(props: { queue: QueueModel }) {
  const { queue } = props
  const inheritedWhitelistId = await queues.resolveWhitelistId({ whitelistId: null })

  return (
    <form
      action={`/admin/queues/${queue.slug}`}
      method="post"
      id="queueSettingsForm"
      class="flex flex-col gap-4"
      data-save-bar
    >
      <SettingCard title="Basics">
        <SettingRow
          label="Name"
          for="name"
          description="Shown in the queue switcher and the page title."
        >
          <input type="text" id="name" name="name" value={queue.name} required />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Who can join">
        <SettingRow
          label="Require player verification"
          for="requireVerification"
          queueSetting={{ queue, field: 'requireVerification' }}
          description="Players must be manually verified by an admin before they can join this queue."
        >
          <div class="flex justify-end">
            <Switch
              id="requireVerification"
              name="requireVerification"
              checked={queue.requireVerification}
            />
          </div>
        </SettingRow>

        {queue.launchMode === 'auto' && gamemodeConfigs[queue.gamemode].autoBalance && (
          <SettingRow
            label="Player skill threshold"
            for="skillThresholdEnabled"
            queueSetting={{ queue, field: 'skillThreshold' }}
            description="Players will be able to join this queue only on classes that meet the given criteria."
          >
            <div class="flex flex-row items-center gap-2">
              <input
                type="checkbox"
                id="skillThresholdEnabled"
                name="skillThresholdEnabled"
                value="enabled"
                checked={queue.skillThreshold !== null}
              />
              <label for="skillThreshold" class="sr-only">
                Player skill threshold value
              </label>
              <input
                type="number"
                id="skillThreshold"
                name="skillThreshold"
                step="any"
                class="min-w-0 flex-1"
                value={queue.skillThreshold?.toString()}
                disabled={queue.skillThreshold === null}
                data-toggle-disabled-form="#queueSettingsForm"
                data-toggle-disabled-control="skillThresholdEnabled"
                data-toggle-disabled-checked="true"
              />
            </div>
          </SettingRow>
        )}
      </SettingCard>

      <SettingCard title="Game server">
        <SettingRow
          label="Whitelist ID"
          for="whitelistId"
          queueSetting={{ queue, field: 'whitelistId' }}
          description="Leave empty to use the global whitelist, set on the Games page."
        >
          <input
            type="text"
            id="whitelistId"
            name="whitelistId"
            value={queue.whitelistId ?? ''}
            placeholder={inheritedWhitelistId ?? ''}
          />
        </SettingRow>
      </SettingCard>

      <SaveBar />
    </form>
  )
}

function MapsTab(props: { queue: QueueModel }) {
  const { queue } = props
  return (
    <div class="flex flex-col gap-4">
      <form
        action={`/admin/queues/${queue.slug}/maps`}
        method="post"
        class="flex flex-col gap-4"
        data-save-bar
      >
        <SettingCard title="Map pool">
          <div class="max-lg:overflow-x-auto">
            <table class="table-auto max-lg:w-full">
              <thead>
                <tr>
                  <th>Map name</th>
                  <th>Config</th>
                </tr>
              </thead>
              <tbody id="mapPoolList">
                {queue.maps.map(map => (
                  <MapPoolEntry {...map} />
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            class="my-4 flex flex-row items-center gap-2 text-white hover:underline"
            data-umami-event="add-map-pool-entry"
            hx-post={`/admin/queues/${queue.slug}/maps/entry`}
            hx-trigger="click"
            hx-target="#mapPoolList"
            hx-swap="beforeend"
          >
            <IconPlus />
            Add map
          </button>
        </SettingCard>
        <SaveBar />
      </form>

      {queue.launchMode === 'auto' && (
        <SettingCard
          title="Map vote"
          description="The maps players can currently vote for. Scramble to draw a new set from the map pool."
        >
          <div class="flex flex-col gap-4 py-4">
            <MapVoteOptions queue={queue._id} />
            <button
              type="button"
              class="button self-center"
              data-variant="accent"
              data-size="dense"
              data-umami-event="scramble-maps"
              hx-put={`/admin/queues/${queue.slug}/maps/scramble`}
              hx-target="#adminPanelMapVoteOptions"
              hx-swap="outerHTML"
            >
              <span>Scramble</span>
            </button>
          </div>
        </SettingCard>
      )}
    </div>
  )
}

function TimersTab(props: { queue: QueueModel }) {
  const { queue } = props
  const units = ['seconds', 'minutes'] as const
  const defaultLabel = (field: 'readyUpTimeout' | 'readyStateTimeout' | 'pickTimeout') =>
    durationUnit.label(queueSettingDefault(field) as number)

  return (
    <form
      action={`/admin/queues/${queue.slug}/timers`}
      method="post"
      class="flex flex-col gap-4"
      data-save-bar
    >
      <SettingCard title="Queue timers">
        <SettingRow
          label="Ready-up timeout"
          for="readyUpTimeout"
          queueSetting={{ queue, field: 'readyUpTimeout' }}
          defaultLabel={defaultLabel('readyUpTimeout')}
          description="How long players have to ready up before they are kicked out of the queue."
        >
          <DurationInput
            id="readyUpTimeout"
            name="readyUpTimeout"
            valueMs={queue.readyUpTimeout}
            units={units}
            min={1}
          />
        </SettingRow>

        <SettingRow
          label="Ready state timeout"
          for="readyStateTimeout"
          queueSetting={{ queue, field: 'readyStateTimeout' }}
          defaultLabel={defaultLabel('readyStateTimeout')}
          description="How long the queue stays in the ready-up state before going back to waiting, unless all players ready up."
        >
          <DurationInput
            id="readyStateTimeout"
            name="readyStateTimeout"
            valueMs={queue.readyStateTimeout}
            units={units}
            min={1}
          />
        </SettingRow>

        {queue.launchMode === 'captain' && (
          <SettingRow
            label="Pick timeout"
            for="pickTimeout"
            queueSetting={{ queue, field: 'pickTimeout' }}
            defaultLabel={defaultLabel('pickTimeout')}
            description="How long a captain has for one turn of the draft."
          >
            <DurationInput
              id="pickTimeout"
              name="pickTimeout"
              valueMs={queue.pickTimeout}
              units={units}
              min={1}
            />
          </SettingRow>
        )}
      </SettingCard>
      <SaveBar />
    </form>
  )
}
