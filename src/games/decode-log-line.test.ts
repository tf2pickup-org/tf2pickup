import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeLogLine } from './decode-log-line'

describe('decodeLogLine()', () => {
  it('decodes the stalemates of cp_snakewater_4056794.log', () => {
    const lines = readFileSync(
      new URL('../../tests/fixtures/logs/cp_snakewater_4056794.log', import.meta.url),
      'utf-8',
    )
      .split(/\r?\n/)
      .filter(line => line.includes('Round_Stalemate'))
      .map(line => line.replace(/^L /, ''))
    expect(lines).toHaveLength(2)
    for (const line of lines) {
      expect(decodeLogLine(line)).toEqual({ type: 'round stalemate' })
    }
  })

  it.each([
    [
      '07/13/2026 - 17:44:53: World triggered "Round_Start"',
      { type: 'round start', at: new Date(2026, 6, 13, 17, 44, 53) },
    ],
    [
      '11/26/2026 - 14:04:41: World triggered "Round_Win" (winner "Red")',
      { type: 'round win', winner: 'red' },
    ],
    [
      '11/26/2026 - 14:04:41: World triggered "Mini_Round_Length" (seconds "251.40")',
      { type: 'round length', lengthMs: 251400 },
    ],
    [
      '11/26/2026 - 14:04:41: "Alice<5><[U:1:12345]><>" connected, address "192.0.2.11:27005"',
      { type: 'player connected', steamId: '76561197960278073', ipAddress: '192.0.2.11' },
    ],
    [
      '11/26/2026 - 14:04:41: "Alice<5><[U:1:12345]><Unassigned>" joined team "Blue"',
      { type: 'player joined team', steamId: '76561197960278073', team: 'blu' },
    ],
    [
      '11/26/2026 - 14:04:41: "Alice<5><[U:1:12345]><Blue>" say "gg"',
      { type: 'player said', steamId: '76561197960278073', message: 'gg' },
    ],
    ['11/26/2026 - 14:04:41: "Alice<5><[U:1:0]><Blue>" say "gg"', { type: 'invalid player' }],
    ['11/26/2026 - 14:04:41: "Alice<5><[U:1:abc]><Blue>" say "gg"', { type: 'invalid player' }],
    [
      '11/26/2026 - 14:04:41: [TFTrue] The log is available here: http://logs.tf/4072522. Type !log to view it.',
      { type: 'logs uploaded', logsUrl: 'http://logs.tf/4072522' },
    ],
    ['11/26/2026 - 14:04:41: Log file closed.', null],
  ])('decodes %s', (line, event) => {
    expect(decodeLogLine(line)).toEqual(event)
  })
})
