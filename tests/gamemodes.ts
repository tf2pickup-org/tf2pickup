// Single source of truth for gamemode-specific knowledge in the e2e suite.
//
// An instance serves one or more gamemodes, chosen at boot via ENABLED_GAMEMODES
// (falling back to the legacy single QUEUE_CONFIG). The first enabled gamemode is
// the instance default and is served at `/`; every other enabled gamemode gets its
// own `/<gamemode>` path. This module centralises the per-gamemode facts (slot
// layout, player count, grep tag, queue path) behind one seam so specs and page
// objects never hard-code them.

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
    tag: '@9v9',
  },
}

// The gamemodes the app under test is serving, in configured order. Mirrors the
// app's own ENABLED_GAMEMODES parsing (with the legacy QUEUE_CONFIG fallback).
export function enabledGamemodes(): Gamemode[] {
  const raw = process.env['ENABLED_GAMEMODES'] ?? process.env['QUEUE_CONFIG'] ?? '6v6'
  return raw
    .split(',')
    .map(value => value.trim())
    .filter((value): value is Gamemode => value === '6v6' || value === '9v9')
}

// The instance default gamemode (the first enabled one), served at `/`.
export function currentGamemode(): Gamemode {
  return enabledGamemodes()[0] ?? '6v6'
}

// The path a gamemode's queue page is served at — the mirror of the app's
// `queuePageUrl`: `/` for the default gamemode, `/<gamemode>` for the rest.
export function queuePath(gamemode: Gamemode): string {
  return gamemode === currentGamemode() ? '/' : `/${gamemode}`
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
