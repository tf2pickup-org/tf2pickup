const queueConfig = process.env['QUEUE_CONFIG'] ?? '6v6'

type SlotId6v6 = `${'scout' | 'soldier'}-${1 | 2 | 3 | 4}` | `${'demoman' | 'medic'}-${1 | 2}`

type SlotId9v9 =
  `${'scout' | 'soldier' | 'pyro' | 'demoman' | 'heavy' | 'engineer' | 'medic' | 'sniper' | 'spy'}-${1 | 2}`

export type SlotId = SlotId6v6 | SlotId9v9

const classes6v6 = [
  { name: 'scout', count: 4 },
  { name: 'soldier', count: 4 },
  { name: 'demoman', count: 2 },
  { name: 'medic', count: 2 },
]

const classes9v9 = [
  { name: 'scout', count: 2 },
  { name: 'soldier', count: 2 },
  { name: 'pyro', count: 2 },
  { name: 'demoman', count: 2 },
  { name: 'heavy', count: 2 },
  { name: 'engineer', count: 2 },
  { name: 'medic', count: 2 },
  { name: 'sniper', count: 2 },
  { name: 'spy', count: 2 },
]

export function* queueSlots(): Generator<SlotId> {
  const classes = queueConfig === '9v9' ? classes9v9 : classes6v6
  for (const gc of classes) {
    for (let i = 1; i <= gc.count; ++i) {
      yield `${gc.name}-${i}` as SlotId
    }
  }
}

export function getPlayerCount(): number {
  return queueConfig === '9v9' ? 18 : 12
}

export function getQueueConfig(): '6v6' | '9v9' {
  return queueConfig as '6v6' | '9v9'
}
