import { describe, it, expect, beforeEach } from 'vitest'
import { analyze } from './analyze'
import { createGameContext } from './create-game-context'
import type { GameContext } from './game-context'
import type { LogEvent } from './log-event'

const logSecretLine = (timestamp: string, rest: string) => `${timestamp}: ${rest}`
const names = (events: LogEvent[]) => events.map(e => e.event)

describe('analyze', () => {
  let context: GameContext

  beforeEach(() => {
    context = createGameContext()
  })

  const roundStart = (timestamp: string) => `${timestamp}: World triggered "Round_Start"`

  describe('restart detection', () => {
    it('emits "round started" for a regular round start', () => {
      expect(analyze(context, roundStart('07/13/2026 - 17:44:53'))).toEqual([
        { event: 'round started' },
      ])
    })

    it('emits "score reset" for a doubled round start mid-game', () => {
      // the real sequence of https://tf2pickup.pl/games/7615: the round started
      // at 17:35:10 was aborted and the match was restarted at 17:39:30
      analyze(context, roundStart('07/13/2026 - 17:35:10'))
      analyze(context, roundStart('07/13/2026 - 17:39:30'))
      const events = analyze(context, roundStart('07/13/2026 - 17:39:30'))
      expect(names(events)).toContain('score reset')
    })

    it('does not emit "score reset" for the doubled round start at the initial match start', () => {
      analyze(context, roundStart('07/13/2026 - 17:33:28'))
      const events = analyze(context, roundStart('07/13/2026 - 17:33:28'))
      expect(names(events)).not.toContain('score reset')
    })

    it('does not emit "score reset" for round starts at different times', () => {
      analyze(context, roundStart('07/13/2026 - 18:01:44'))
      const events = analyze(context, roundStart('07/13/2026 - 18:07:40'))
      expect(names(events)).not.toContain('score reset')
    })

    it('does not emit "score reset" when a round ended in a stalemate in between', () => {
      analyze(context, roundStart('05/16/2026 - 16:46:17'))
      analyze(context, logSecretLine('05/16/2026 - 16:46:17', 'World triggered "Round_Stalemate"'))
      const events = analyze(context, roundStart('05/16/2026 - 16:46:17'))
      expect(names(events)).not.toContain('score reset')
    })

    it('emits "score reset" for a doubled round start straddling a second boundary mid-game', () => {
      analyze(context, roundStart('07/13/2026 - 17:30:00'))
      analyze(context, roundStart('07/13/2026 - 17:35:10'))
      const events = analyze(context, roundStart('07/13/2026 - 17:35:11'))
      expect(names(events)).toContain('score reset')
    })

    it('does not emit "score reset" for the initial doubled round start straddling a second boundary', () => {
      // real case: https://logs.tf/4084159
      analyze(context, roundStart('07/13/2026 - 16:35:01'))
      const events = analyze(context, roundStart('07/13/2026 - 16:35:02'))
      expect(names(events)).not.toContain('score reset')
    })

    it('does not emit "score reset" when a round was won in between', () => {
      analyze(context, roundStart('06/16/2026 - 10:38:23'))
      analyze(
        context,
        logSecretLine('06/16/2026 - 10:38:23', 'World triggered "Round_Win" (winner "Blue")'),
      )
      const events = analyze(context, roundStart('06/16/2026 - 10:38:23'))
      expect(names(events)).not.toContain('score reset')
    })
  })

  describe('round assembly', () => {
    const at = '07/13/2026 - 17:05:00'

    it('assembles a round from separate lines into "round ended"', () => {
      analyze(context, roundStart('07/13/2026 - 17:00:00'))
      analyze(context, logSecretLine(at, 'World triggered "Round_Win" (winner "Blue")'))
      analyze(context, logSecretLine(at, 'World triggered "Round_Length" (seconds "300.5")'))
      analyze(context, logSecretLine(at, 'Team "Blue" current score "1" with "6" players'))
      const events = analyze(
        context,
        logSecretLine(at, 'Team "Red" current score "0" with "6" players'),
      )
      expect(events).toEqual([
        {
          event: 'round ended',
          winner: 'blu',
          lengthMs: 300500,
          score: { red: 0, blu: 1 },
          captures: { red: [], blu: [] },
        },
      ])
    })

    it('does not emit "round ended" until the round is complete', () => {
      analyze(context, logSecretLine(at, 'World triggered "Round_Win" (winner "Blue")'))
      const events = analyze(
        context,
        logSecretLine(at, 'Team "Blue" current score "1" with "6" players'),
      )
      expect(events).toEqual([])
    })

    it('tracks the running score across rounds', () => {
      const endRound = (winner: string, red: number, blu: number) => {
        analyze(context, logSecretLine(at, `World triggered "Round_Win" (winner "${winner}")`))
        analyze(context, logSecretLine(at, 'World triggered "Round_Length" (seconds "120")'))
        analyze(context, logSecretLine(at, `Team "Blue" current score "${blu}" with "6" players`))
        return analyze(
          context,
          logSecretLine(at, `Team "Red" current score "${red}" with "6" players`),
        )
      }
      endRound('Blue', 0, 1)
      const events = endRound('Red', 1, 1)
      expect(events).toEqual([
        {
          event: 'round ended',
          winner: 'red',
          lengthMs: 120000,
          score: { red: 1, blu: 1 },
          captures: { red: [], blu: [] },
        },
      ])
    })
  })

  describe('stopwatch side-swap', () => {
    const at = '07/13/2026 - 17:05:00'

    it('emits "teams swapped" at the next round start after a stopwatch round', () => {
      analyze(context, roundStart('07/13/2026 - 17:00:00'))
      analyze(context, logSecretLine(at, 'Team "Blue" triggered "pointcaptured" (cp "1")'))
      analyze(context, logSecretLine(at, 'Team "Blue" triggered "pointcaptured" (cp "2")'))
      analyze(context, logSecretLine(at, 'World triggered "Round_Win" (winner "Blue")'))
      analyze(context, logSecretLine(at, 'World triggered "Round_Length" (seconds "120")'))
      analyze(context, logSecretLine(at, 'Team "Blue" current score "2" with "6" players'))
      const ended = analyze(
        context,
        logSecretLine(at, 'Team "Red" current score "0" with "6" players'),
      )
      expect(names(ended)).toContain('round ended')

      const started = analyze(context, roundStart('07/13/2026 - 17:10:00'))
      expect(names(started)).toEqual(['teams swapped', 'round started'])
    })

    it('does not swap on a cp/koth round (no captures, score grows by one)', () => {
      analyze(context, roundStart('07/13/2026 - 17:00:00'))
      analyze(context, logSecretLine(at, 'World triggered "Round_Win" (winner "Blue")'))
      analyze(context, logSecretLine(at, 'World triggered "Round_Length" (seconds "120")'))
      analyze(context, logSecretLine(at, 'Team "Blue" current score "1" with "6" players'))
      analyze(context, logSecretLine(at, 'Team "Red" current score "0" with "6" players'))

      const started = analyze(context, roundStart('07/13/2026 - 17:10:00'))
      expect(names(started)).toEqual(['round started'])
    })
  })

  describe('idempotency', () => {
    const at = '07/13/2026 - 17:05:00'

    it('does not re-emit "round ended" when the final score line repeats', () => {
      analyze(context, roundStart('07/13/2026 - 17:00:00'))
      analyze(context, logSecretLine(at, 'World triggered "Round_Win" (winner "Blue")'))
      analyze(context, logSecretLine(at, 'World triggered "Round_Length" (seconds "120")'))
      analyze(context, logSecretLine(at, 'Team "Blue" current score "1" with "6" players'))
      const first = analyze(
        context,
        logSecretLine(at, 'Team "Red" current score "0" with "6" players'),
      )
      expect(names(first)).toContain('round ended')

      // the same cumulative score arriving again must not commit a second round
      const repeat = analyze(
        context,
        logSecretLine(at, 'Team "Blue" current score "1" with "6" players'),
      )
      expect(names(repeat)).not.toContain('round ended')
    })
  })

  describe('player and upload events', () => {
    it('emits "player connected"', () => {
      const line =
        '07/13/2026 - 17:00:00: "foo<12><[U:1:1234567]><>" connected, address "1.2.3.4:27005"'
      const events = analyze(context, line)
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({ event: 'player connected', ipAddress: '1.2.3.4' })
      expect((events[0] as { steamId: string }).steamId).toMatch(/^7656\d+$/)
    })

    it('emits "player joined team"', () => {
      const line = '07/13/2026 - 17:00:00: "foo<12><[U:1:1234567]><Unassigned>" joined team "Red"'
      const events = analyze(context, line)
      expect(events[0]).toMatchObject({ event: 'player joined team', team: 'red' })
    })

    it('emits "player disconnected"', () => {
      const line =
        '07/13/2026 - 17:00:00: "foo<12><[U:1:1234567]><Red>" disconnected (reason "Disconnect")'
      const events = analyze(context, line)
      expect(events[0]).toMatchObject({ event: 'player disconnected' })
    })

    it('emits "player said"', () => {
      const line = '07/13/2026 - 17:00:00: "foo<12><[U:1:1234567]><Red>" say "gg"'
      const events = analyze(context, line)
      expect(events[0]).toMatchObject({ event: 'player said', message: 'gg' })
    })

    it('emits "final score"', () => {
      const line = '07/13/2026 - 17:00:00: Team "Red" final score "3" with "6" players'
      expect(analyze(context, line)).toEqual([{ event: 'final score', team: 'red', score: 3 }])
    })

    it('emits "match ended" for Game_Over', () => {
      const line = '07/13/2026 - 17:00:00: World triggered "Game_Over" reason "test"'
      expect(analyze(context, line)).toEqual([{ event: 'match ended' }])
    })

    it('emits "logs uploaded"', () => {
      const line =
        '07/13/2026 - 17:00:00: [TFTrue] The logs are available here: http://logs.tf/123456. Blah'
      expect(analyze(context, line)).toEqual([
        { event: 'logs uploaded', logsUrl: 'http://logs.tf/123456' },
      ])
    })

    it('emits "demo uploaded"', () => {
      const line = '07/13/2026 - 17:00:00: [demos.tf]: STV available at: https://demos.tf/123'
      expect(analyze(context, line)).toEqual([
        { event: 'demo uploaded', demoUrl: 'https://demos.tf/123' },
      ])
    })

    it('returns [] for an unrecognized line', () => {
      expect(analyze(context, '07/13/2026 - 17:00:00: some random log line')).toEqual([])
    })
  })
})
