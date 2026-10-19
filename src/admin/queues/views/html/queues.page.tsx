import { collections } from '../../../../database/collections'
import { gamemodeConfigs } from '../../../../gamemodes/configs'
import { IconPlus, IconTrash } from '../../../../html/components/icons'
import { queues } from '../../../../queues'
import { queuePresets } from '../../../../queues/presets'
import { Gamemode } from '../../../../shared/types/gamemode'
import { Admin } from '../../../views/html/admin'

export async function QueuesPage() {
  const all = await queues.list()
  const playerCounts = new Map(
    await Promise.all(
      all.map(
        async ({ _id }) =>
          [
            _id.toHexString(),
            await collections.queueSlots.countDocuments({ queue: _id, player: { $ne: null } }),
          ] as const,
      ),
    ),
  )

  return (
    <Admin activePage="queues">
      <div class="admin-panel-set flex flex-col gap-4">
        <table class="w-full text-left">
          <thead>
            <tr>
              <th>Order</th>
              <th>Name</th>
              <th>Slug</th>
              <th>Gamemode</th>
              <th>Players</th>
              <th>Enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {all.map((queue, i) => (
              <tr aria-label={`Queue ${queue.slug}`}>
                <td class="flex flex-row gap-1">
                  <MoveButton slug={queue.slug} direction="up" disabled={i === 0} />
                  <MoveButton slug={queue.slug} direction="down" disabled={i === all.length - 1} />
                </td>
                <td>
                  <a href={`/admin/queues/${queue.slug}`} class="underline" safe>
                    {queue.name}
                  </a>
                </td>
                <td safe>{queue.slug}</td>
                <td>{queue.gamemode}</td>
                <td>
                  {playerCounts.get(queue._id.toHexString()) ?? 0}/
                  {gamemodeConfigs[queue.gamemode].classes.reduce(
                    (sum, { count }) => sum + count * 2,
                    0,
                  )}
                </td>
                <td>
                  <form
                    method="post"
                    action={`/admin/queues/${queue.slug}/${queue.enabled ? 'disable' : 'enable'}`}
                  >
                    <button type="submit" class="button" data-size="dense">
                      {queue.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </form>
                </td>
                <td>
                  <form
                    method="post"
                    action={`/admin/queues/${queue.slug}/delete`}
                    hx-confirm={`Delete queue ${queue.name}? This cannot be undone.`}
                  >
                    <button
                      type="submit"
                      class="text-white disabled:opacity-30"
                      disabled={queue.enabled}
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

      <form method="post" action="/admin/queues" class="admin-panel-set flex flex-col gap-2">
        <h3 class="text-lg font-bold">Add queue</h3>
        <label for="template">Start from</label>
        <select id="template" name="template">
          <option value="">Blank</option>
          {queuePresets.map(({ slug, name }) => (
            <option value={slug} safe>
              {name}
            </option>
          ))}
        </select>
        <label for="slug">Slug</label>
        <input id="slug" name="slug" type="text" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        <label for="name">Name</label>
        <input id="name" name="name" type="text" required />
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

function MoveButton(props: { slug: string; direction: 'up' | 'down'; disabled: boolean }) {
  return (
    <form method="post" action={`/admin/queues/${props.slug}/move?direction=${props.direction}`}>
      <button
        type="submit"
        class="text-white disabled:opacity-30"
        disabled={props.disabled}
        aria-label={`Move queue ${props.slug} ${props.direction}`}
      >
        {props.direction === 'up' ? '↑' : '↓'}
      </button>
    </form>
  )
}
