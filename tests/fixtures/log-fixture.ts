import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Reads a real gameserver log captured from logs.tf, returning its lines so they
// can be replayed through GameServerSimulator.feedLogs().
export function logFixture(name: string): string[] {
  const path = fileURLToPath(new URL(`./logs/${name}`, import.meta.url))
  return readFileSync(path, 'utf-8').split(/\r?\n/)
}
