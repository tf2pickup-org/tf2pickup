import { IconMinus } from '../../../../html/components/icons'
import { durationUnit } from '../../../games/duration-unit'

export function CooldownLevelEntry(props: { banLengthMs: number }) {
  const { value, unit } = durationUnit.split(props.banLengthMs)

  return (
    <div class="cooldown-level-row flex flex-row items-center gap-2">
      <span class="cooldown-level-index w-6 shrink-0 text-end text-zinc-200 tabular-nums" />
      <input
        type="number"
        name="banLength[]"
        value={value.toString()}
        min="0"
        step="any"
        required
        class="w-24 min-w-0"
      />
      <select name="banLengthUnit[]" class="w-28 shrink-0">
        {durationUnit.all.map(u => (
          <option value={u} selected={u === unit}>
            {u}
          </option>
        ))}
      </select>
      <button
        type="button"
        class="shrink-0 text-zinc-200 hover:text-white"
        aria-label="Remove level"
        data-remove-closest=".cooldown-level-row"
      >
        <IconMinus />
      </button>
    </div>
  )
}
