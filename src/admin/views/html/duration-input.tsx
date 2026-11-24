import { durationUnit } from '../../games/duration-unit'

export function DurationInput(props: {
  id: string
  name: string
  valueMs: number
  units?: readonly (typeof durationUnit.all)[number][]
}) {
  const { value, unit } = durationUnit.split(props.valueMs)
  const units = props.units ?? durationUnit.all
  return (
    <div class="flex flex-row gap-2">
      <input
        type="number"
        id={props.id}
        name={props.name}
        value={value.toString()}
        min="0"
        step="any"
        required
        class="min-w-0 flex-1"
      />
      <select name={`${props.name}Unit`} aria-label="Unit" class="w-32 shrink-0">
        {(units.includes(unit) ? units : [unit, ...units]).map(u => (
          <option value={u} selected={u === unit}>
            {u}
          </option>
        ))}
      </select>
    </div>
  )
}
