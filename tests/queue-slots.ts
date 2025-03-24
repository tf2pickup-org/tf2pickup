export type SlotId = `${'scout' | 'soldier'}-${1 | 2 | 3 | 4}` | `${'demoman' | 'medic'}-${1 | 2}`

// Generate all slots in a 6v6 queue
export function* queueSlots(): Generator<SlotId> {
  for (const gc of ['scout', 'soldier']) {
    for (let i = 1; i <= 4; ++i) {
      yield `${gc}-${i}` as SlotId
    }
  }

  for (const gc of ['demoman', 'medic']) {
    for (let i = 1; i <= 2; ++i) {
      yield `${gc}-${i}` as SlotId
    }
  }
}
