// Single source of truth for gamemode-specific knowledge in the e2e suite.
//
// Today an instance serves exactly one gamemode, chosen at boot via QUEUE_CONFIG,
// and every queue lives at `/`. This module centralises the per-gamemode facts
// (slot layout, player count, grep tag, queue path) behind one seam so the
// upcoming multi-gamemode migration only has to widen it — swapping the env-driven
// `currentGamemode()` for a per-path selection and giving each gamemode its own
// `path` — instead of touching every spec and page object.

type SlotId6v6 = `${'scout' | 'soldier'}-${1 | 2 | 3 | 4}` | `${'demoman' | 'medic'}-${1 | 2}`

type SlotId9v9 =
  `${'scout' | 'soldier' | 'pyro' | 'demoman' | 'heavy' | 'engineer' | 'medic' | 'sniper' | 'spy'}-${1 | 2}`

export type SlotId = SlotId6v6 | SlotId9v9

export type Gamemode = '6v6' | '9v9'

interface GameClass {
  name: string
  // total slots across both teams
  count: number
}

interface GamemodeDefinition {
  classes: GameClass[]
  // path the queue page is served at — `/` for every gamemode today, distinct
  // per-gamemode paths (`/6v6`, `/9v9`, …) once the app serves several at once
  path: string
  // Playwright grep tag used by the CI matrix to run the suite per gamemode
  tag: `@${Gamemode}`
}

export const gamemodes: Record<Gamemode, GamemodeDefinition> = {
  '6v6': {
    classes: [
      { name: 'scout', count: 4 },
      { name: 'soldier', count: 4 },
      { name: 'demoman', count: 2 },
      { name: 'medic', count: 2 },
    ],
    path: '/',
    tag: '@6v6',
  },
  '9v9': {
    classes: [
      { name: 'scout', count: 2 },
      { name: 'soldier', count: 2 },
      { name: 'pyro', count: 2 },
      { name: 'demoman', count: 2 },
      { name: 'heavy', count: 2 },
      { name: 'engineer', count: 2 },
      { name: 'medic', count: 2 },
      { name: 'sniper', count: 2 },
      { name: 'spy', count: 2 },
    ],
    path: '/',
    tag: '@9v9',
  },
}

// The gamemode the app under test is currently serving. Env-driven today; the
// multi-gamemode migration replaces this with a per-page/per-path selection.
export function currentGamemode(): Gamemode {
  return process.env['QUEUE_CONFIG'] === '9v9' ? '9v9' : '6v6'
}

export function* queueSlots(gamemode: Gamemode = currentGamemode()): Generator<SlotId> {
  for (const gc of gamemodes[gamemode].classes) {
    for (let i = 1; i <= gc.count; ++i) {
      yield `${gc.name}-${i}` as SlotId
    }
  }
}

export function getPlayerCount(gamemode: Gamemode = currentGamemode()): number {
  return gamemodes[gamemode].classes.reduce((count, gc) => count + gc.count, 0)
}
