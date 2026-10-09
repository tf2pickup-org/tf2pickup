import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { UserName } from '../user-manager'

// The incoming (9v9) instance's host, as its old game links name it.
export const sourceHost = 'hl.localhost'
// Plays on both instances.
export const skilledPlayer: UserName = 'Mayflower'
export const primarySkill = { scout: 5, soldier: 4, demoman: 3, medic: 2 }
export const incomingSkill = { scout: 2, soldier: 3, demoman: 4, medic: 5 }
// set instance-wide on the incoming instance; both become its gamemode's
export const incomingDefaultSpySkill = 4
export const incomingWhitelistId = 'merge_hl_whitelist'
export const incomingMapPool = [
  { name: 'cp_merge_a', execConfig: 'merge_config_a' },
  { name: 'cp_merge_b', execConfig: 'merge_config_b' },
  { name: 'koth_merge_c', execConfig: 'merge_config_c' },
]

// The game each instance played before the merge, by its number there.
interface MergeState {
  primaryGame?: number
  incomingGame?: number
}

const path = resolve(import.meta.dirname, '.state.json')

export async function loadState(): Promise<MergeState> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as MergeState
  } catch {
    return {}
  }
}

export async function saveState(state: MergeState) {
  await writeFile(path, JSON.stringify({ ...(await loadState()), ...state }))
}
