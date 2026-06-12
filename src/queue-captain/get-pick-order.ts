import { Tf2Team } from '../shared/types/tf2-team'
import type { QueueConfig } from '../queue/types/queue-config'

export function getPickOrder(config: QueueConfig): Tf2Team[] {
  const totalPlayers = config.classes.reduce((sum, c) => sum + c.count * config.teamCount, 0)
  const nonCaptainPicks = totalPlayers - config.teamCount

  const order: Tf2Team[] = []
  let remaining = nonCaptainPicks
  let pickSize = 1
  let team: Tf2Team = Tf2Team.blu

  while (remaining > 0) {
    const take = Math.min(pickSize, remaining)
    for (let i = 0; i < take; i++) {
      order.push(team)
    }
    remaining -= take
    team = team === Tf2Team.blu ? Tf2Team.red : Tf2Team.blu
    if (pickSize === 1) {
      pickSize = 2
    } else if (remaining === 1) {
      pickSize = 1
    }
  }

  return order
}
