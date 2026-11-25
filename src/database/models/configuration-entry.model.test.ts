import { describe, expect, it } from 'vitest'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { configurationSchema } from './configuration-entry.model'

const cooldowns = (scout: number) =>
  Object.fromEntries(
    Object.values(Tf2ClassName).map(c => [c, c === Tf2ClassName.scout ? scout : 0]),
  )

describe('configurationSchema', () => {
  it.each([
    ['games.join_gameserver_timeout', -1],
    ['games.rejoin_gameserver_timeout', -1],
    ['games.auto_force_end_threshold', -1],
    ['games.auto_force_end_threshold', 1.5],
    ['games.cooldown_levels', [{ level: 0, banLengthMs: -1 }]],
    ['games.join_queue_cooldown', cooldowns(-1)],
    ['players.minimum_in_game_hours', -1],
  ])('rejects %s = %j', (key, value) => {
    expect(configurationSchema.safeParse({ key, value }).success).toBe(false)
  })

  it.each([
    ['games.join_gameserver_timeout', 0],
    ['games.join_queue_cooldown', cooldowns(0)],
    ['games.auto_force_end_threshold', 0],
    ['players.minimum_in_game_hours', 0],
  ])('accepts %s = %j', (key, value) => {
    expect(configurationSchema.safeParse({ key, value }).success).toBe(true)
  })
})
