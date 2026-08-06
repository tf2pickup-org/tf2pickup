import { Tf2Team } from '../../shared/types/tf2-team'

/**
 * Who bans each map, in order.
 *
 * RED bans first — BLU had the first player pick, so the first ban is what evens that out. With
 * three options and two bans, whatever survives is the map.
 */
export function banOrder(mapOptions: string[]): Tf2Team[] {
  return Array.from({ length: Math.max(mapOptions.length - 1, 0) }, (_, turn) =>
    turn % 2 === 0 ? Tf2Team.red : Tf2Team.blu,
  )
}
