import type { QueuePlayerModel } from '../database/models/queue-player.model'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { QueueConfig } from '../queue/types/queue-config'

function maxMatching(players: QueuePlayerModel[], slots: Tf2ClassName[]): number {
  const adj: number[][] = players.map(p =>
    slots.reduce<number[]>((acc, className, idx) => {
      if (p.offeredClasses.includes(className)) {
        acc.push(idx)
      }
      return acc
    }, []),
  )

  const match = new Array<number>(slots.length).fill(-1)

  function dfs(u: number, visited: boolean[]): boolean {
    for (const v of adj[u]!) {
      if (!visited[v]) {
        visited[v] = true
        if (match[v] === -1 || dfs(match[v]!, visited)) {
          match[v] = u
          return true
        }
      }
    }
    return false
  }

  let matched = 0
  for (let u = 0; u < players.length; u++) {
    const visited = new Array<boolean>(slots.length).fill(false)
    if (dfs(u, visited)) matched++
    if (matched === slots.length) break
  }

  return matched
}

export function buildSlotList(config: QueueConfig): Tf2ClassName[] {
  const slots: Tf2ClassName[] = []
  for (const cls of config.classes) {
    for (let i = 0; i < cls.count * config.teamCount; i++) {
      slots.push(cls.name)
    }
  }
  return slots
}

export function canFillSlots(players: QueuePlayerModel[], slots: Tf2ClassName[]): boolean {
  if (players.length < slots.length) return false
  return maxMatching(players, slots) === slots.length
}

export function canFormTeams(players: QueuePlayerModel[], config: QueueConfig): boolean {
  return canFillSlots(players, buildSlotList(config))
}
