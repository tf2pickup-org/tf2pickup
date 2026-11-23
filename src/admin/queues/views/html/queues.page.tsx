import { gamemodeConfigs } from '../../../../gamemodes/configs'
import { IconPlus, IconTrash } from '../../../../html/components/icons'
import { Switch } from '../../../../html/components/switch'
import { queues } from '../../../../queues'
import { QueueSwitcher } from '../../../../queues/views/html/queue-switcher'
import { queuePresets } from '../../../../queues/presets'
import { Gamemode } from '../../../../shared/types/gamemode'
import { Admin } from '../../../views/html/admin'
import { configuration } from '../../../../configuration'
import { durationUnit } from '../../../games/duration-unit'
import { DurationInput } from '../../../views/html/duration-input'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'
export async function QueuesPage() {
  return (
    <Admin activePage="queues">
      <QueueList />

      <form method="post" action="/admin/all-queues" class="mt-4" data-save-bar>
        <SettingCard
          title="All queues"
          description="Applies to every queue. Anything specific to one queue is on that queue's page."
        >
          <SettingRow
            label="Pre-ready-up duration"
            for="preReadyUpTimeout"
            configKey="queue.pre_ready_up_timeout"
            defaultLabel={durationUnit.label(
              configuration.getDefault('queue.pre_ready_up_timeout'),
            )}
            description="How long a player's pre-ready lasts. Pre-readied players are readied up automatically when the queue fills."
          >
            <DurationInput
              id="preReadyUpTimeout"
              name="preReadyUpTimeout"
              valueMs={await configuration.get('queue.pre_ready_up_timeout')}
              units={['seconds', 'minutes']}
              min={1}
            />
          </SettingRow>
        </SettingCard>
        <SaveBar />
      </form>

      <form method="post" action="/admin/queues" class="admin-panel-set mt-4 flex flex-col gap-2">
        <h3 class="text-lg font-bold">Add queue</h3>
        <label for="template">Start from</label>
        <select
          id="template"
          name="template"
          onchange="this.form.launchMode.value = this.selectedOptions[0].dataset.launchMode ?? 'auto'"
        >
          <option value="">Blank</option>
          {queuePresets.map(preset => (
            <option value={preset.slug} data-launch-mode={preset.launchMode} safe>
              {preset.name}
            </option>
          ))}
        </select>
        <label for="name">Name</label>
        <input id="name" name="name" type="text" required />
        <label for="slug">Slug</label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          data-slug-from="name"
        />
        <label for="launchMode">Launch mode</label>
        <select id="launchMode" name="launchMode">
          <option value="auto">auto</option>
          <option value="captain">captain (6v6 and 9v9 only)</option>
        </select>
        <label for="gamemode">Gamemode (blank queues only)</label>
        <select id="gamemode" name="gamemode">
          {Object.values(Gamemode).map(gamemode => (
            <option value={gamemode}>{gamemode}</option>
          ))}
        </select>
        <p>
          <button type="submit" class="button mt-2" data-variant="accent" data-size="dense">
            <IconPlus size={20} />
            <span>Add queue</span>
          </button>
        </p>
      </form>
    </Admin>
  )
}

// Not set on #queue-list itself: its links would inherit it.
const swapList = {
  'hx-target': '#queue-list',
  'hx-select': '#queue-list',
  'hx-swap': 'outerHTML',
  'hx-select-oob': '#flash-messages',
}

// Swapped as a whole after every change, so the switcher preview follows the list.
async function QueueList() {
  const all = await queues.list()
  const playerCounts = await Promise.all(all.map(queues.playerCounts))
  const enabled = all.filter(queue => queue.enabled)

  return (
    <div id="queue-list" class="flex flex-col gap-4">
      <SettingCard
        title="Queue switcher"
        description="What players see at the top of the queue page. The first enabled queue is the default one, served on the front page."
      >
        {enabled.length >= 2 ? (
          <div inert class="admin-queue-switcher-preview">
            <QueueSwitcher active={enabled[0]!} />
          </div>
        ) : (
          <p class="setting-card-description pb-4">
            Only one queue is enabled, so the queue page shows no switcher.
          </p>
        )}
      </SettingCard>

      <form id="queue-order" method="post" action="/admin/all-queues/order" {...swapList}></form>
      <div class="admin-panel-set">
        <table class="admin-queue-list w-full text-left">
          <thead>
            <tr>
              <th>
                <span class="sr-only">Order</span>
              </th>
              <th>Name</th>
              <th>Slug</th>
              <th>Gamemode</th>
              <th>Launch mode</th>
              <th>Players</th>
              <th>Enabled</th>
              <th>
                <span class="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody data-queue-order="queue-order">
            {all.map((queue, i) => (
              <tr aria-label={`Queue ${queue.slug}`}>
                <td>
                  <div class="flex flex-row items-center gap-1">
                    <span class="admin-queue-drag-handle" data-drag-handle aria-hidden="true">
                      ⠿
                    </span>
                    <MoveButton slug={queue.slug} direction="up" disabled={i === 0} />
                    <MoveButton
                      slug={queue.slug}
                      direction="down"
                      disabled={i === all.length - 1}
                    />
                    <input type="hidden" form="queue-order" name="order[]" value={queue.slug} />
                  </div>
                </td>
                <td>
                  <a href={`/admin/queues/${queue.slug}`} class="underline" safe>
                    {queue.name}
                  </a>
                </td>
                <td safe>{queue.slug}</td>
                <td>{queue.gamemode}</td>
                <td>{queue.launchMode}</td>
                <td>
                  {playerCounts[i]!.current}/
                  {gamemodeConfigs[queue.gamemode].classes.reduce(
                    (sum, { count }) => sum + count * 2,
                    0,
                  )}
                </td>
                <td>
                  <Switch
                    id={`queue-${queue.slug}-enabled`}
                    role="switch"
                    aria-label={`Queue ${queue.slug} enabled`}
                    checked={queue.enabled}
                    disabled={queue.enabled && enabled.length === 1}
                    hx-post={`/admin/queues/${queue.slug}/${queue.enabled ? 'disable' : 'enable'}`}
                    hx-trigger="change"
                    {...swapList}
                    data-umami-event="toggle-queue"
                  />
                </td>
                <td>
                  <form
                    method="post"
                    action={`/admin/queues/${queue.slug}/delete`}
                    {...swapList}
                    hx-confirm={`Delete queue ${queue.name}? This cannot be undone.`}
                  >
                    <button
                      type="submit"
                      class="text-white disabled:opacity-30"
                      disabled={queue.enabled}
                      title={queue.enabled ? 'Disable the queue to delete it' : undefined}
                      aria-label={`Delete queue ${queue.slug}`}
                    >
                      <IconTrash />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MoveButton(props: { slug: string; direction: 'up' | 'down'; disabled: boolean }) {
  return (
    <button
      type="button"
      id={`queue-${props.slug}-${props.direction}`}
      class="text-white disabled:opacity-30"
      disabled={props.disabled}
      aria-label={`Move queue ${props.slug} ${props.direction}`}
      data-move={props.direction}
    >
      {props.direction === 'up' ? '↑' : '↓'}
    </button>
  )
}
