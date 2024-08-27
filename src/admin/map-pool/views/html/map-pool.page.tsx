import type { User } from '../../../../auth/types/user'
import { IconDeviceFloppy, IconMinus, IconPlus } from '../../../../html/components/icons'
import { mapPool } from '../../../../queue/map-pool'
import { Admin } from '../../../views/html/admin'

export async function MapPoolPage(props: { user: User }) {
  const maps = await mapPool.get()

  return (
    <Admin activePage="map-pool" user={props.user}>
      <form action="" method="post">
        <div class="admin-panel-set">
          <table class="table-auto">
            <thead>
              <tr>
                <th>Map name</th>
                <th>Config</th>
              </tr>
            </thead>

            <tbody id="mapPoolList">
              {maps.map(props => (
                <MapPoolEntry {...props} />
              ))}
            </tbody>
          </table>

          <button
            class="mt-2 flex flex-row items-center gap-2 text-white hover:underline"
            hx-post="/admin/map-pool/create"
            hx-trigger="click"
            hx-target="#mapPoolList"
            hx-swap="beforeend"
          >
            <IconPlus />
            Add map
          </button>
        </div>

        <p>
          <button type="submit" class="button button--accent mt-6">
            <IconDeviceFloppy />
            Save
          </button>
        </p>
      </form>
    </Admin>
  )
}

export function MapPoolEntry(props: { name: string; execConfig?: string | undefined }) {
  return (
    <tr>
      <td>
        <input type="text" name="name[]" value={props.name} required />
      </td>
      <td>
        <input type="text" name="execConfig[]" value={props.execConfig} />
      </td>
      <td>
        <button class="text-white" _="on click remove closest <tr/>">
          <IconMinus />
        </button>
      </td>
    </tr>
  )
}