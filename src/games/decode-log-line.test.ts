import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeLogLine } from './decode-log-line'

const fixturesDir = new URL('../../tests/fixtures/logs/', import.meta.url)

describe('decodeLogLine()', () => {
  it.each(readdirSync(fixturesDir))('classifies every line of %s', fixture => {
    const lines = readFileSync(new URL(fixture, fixturesDir), 'utf-8')
      .split(/\r?\n/)
      .map(line => line.replace(/^L /, ''))
      .filter(Boolean)
    expect(lines.map(line => decodeLogLine(line)?.type ?? null)).toMatchSnapshot()
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
      '11/26/2026 - 14:04:41: "maly<5><[U:1:114143419]><>" connected, address "192.168.1.11:27005"',
      { type: 'player connected', steamId: '76561198074409147', ipAddress: '192.168.1.11' },
    ],
    [
      '11/26/2026 - 14:04:41: "maly<5><[U:1:114143419]><Unassigned>" joined team "Blue"',
      { type: 'player joined team', steamId: '76561198074409147', team: 'blu' },
    ],
    [
      '11/26/2026 - 14:04:41: "maly<5><[U:1:114143419]><Blue>" say "gg"',
      { type: 'player said', steamId: '76561198074409147', message: 'gg' },
    ],
    ['11/26/2026 - 14:04:41: "maly<5><[U:1:0]><Blue>" say "gg"', { type: 'invalid player' }],
    [
      '11/26/2026 - 14:04:41: [TFTrue] The log is available here: http://logs.tf/4072522. Type !log to view it.',
      { type: 'logs uploaded', logsUrl: 'http://logs.tf/4072522' },
    ],
    ['11/26/2026 - 14:04:41: Log file closed.', null],
  ])('decodes %s', (line, event) => {
    expect(decodeLogLine(line)).toEqual(event)
  })
})
