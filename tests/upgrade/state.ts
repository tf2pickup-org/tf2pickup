import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// What the before-specs saw on the old version, for the after-specs to compare against.
export interface UpgradeState {
  gameNumber: number
  medic: string
  medicElo: string
}

const path = resolve(import.meta.dirname, '.state.json')

export async function saveState(state: UpgradeState) {
  await writeFile(path, JSON.stringify(state))
}

export async function loadState(): Promise<UpgradeState> {
  return JSON.parse(await readFile(path, 'utf-8')) as UpgradeState
}
