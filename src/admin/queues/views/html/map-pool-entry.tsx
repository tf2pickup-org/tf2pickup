import { IconMinus } from '../../../../html/components/icons'

export function MapPoolEntry(props: { name: string; execConfig?: string | undefined }) {
  return (
    <tr>
      <td>
        <input
          type="text"
          name="name[]"
          aria-label="Map name"
          value={props.name}
          required
          class="max-lg:w-full max-lg:min-w-0"
        />
      </td>
      <td>
        <input
          type="text"
          name="execConfig[]"
          aria-label="Map config"
          value={props.execConfig}
          class="max-lg:w-full max-lg:min-w-0"
        />
      </td>
      <td>
        <button class="text-white" data-remove-closest="tr" aria-label="Remove map">
          <IconMinus />
        </button>
      </td>
    </tr>
  )
}
