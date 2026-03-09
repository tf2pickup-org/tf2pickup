import { describe, expect, it } from 'vitest'
import { parseStatus } from './parse-status'
import type { SteamId64 } from '../../shared/types/steam-id-64'

const exampleStatusOutput = `hostname: serveme.tf #1526420
version : 10336138/24 10336138 secure
udp/ip  : 10.0.0.1:5280  (local: 10.0.0.1:27165)  (public IP from Steam: 10.0.0.1)
steamid : [A:1:1660969990:48340] (90279612927468550)
account : not logged in  (No account specified)
map     : cp_process_f12 at: 0 x, 0 y, 0 z
tags    : cp,nocrits
sourcetv:  10.0.0.1:5280, delay 90.0s  (local: 10.0.0.1:27170)
players : 12 humans, 1 bots (25 max)
edicts  : 720 used of 2048 max
# userid name                uniqueid            connected ping loss state  adr
#      2 "SourceTV"          BOT                                     active
#      3 "dosu"              [U:1:186867964]     20:51       60    0 active 10.0.0.2:27005
#      4 "msciwy pedal"      [U:1:1010740820]    20:49       60    0 active 10.0.0.3:27005
#      5 "mejf tajson"       [U:1:202138486]     20:49       53    0 active 10.0.0.4:27005
#      6 "Pawel"             [U:1:364546186]     20:48       62    0 active 10.0.0.5:27005
#      7 "cezZ"              [U:1:1004961620]    20:46       71    0 active 10.0.0.6:27005
#      8 "anian"             [U:1:101608870]     20:45       59    0 active 10.0.0.7:27005
#      9 "piquu"             [U:1:105630318]     20:41       89    0 active 10.0.0.8:27005
#     10 "Kazachu 🐉"      [U:1:32383999]      20:27       65    0 active 10.0.0.9:27005
#     11 "wise zew :p"       [U:1:394488737]     20:07       60    0 active 10.0.0.10:27005
#     14 "czczz"             [U:1:45609999]      17:58       82    0 active 10.0.0.11:27005
#     13 "sam sung el dzekson" [U:1:148896172]   18:40       76    0 active 10.0.0.12:27005
#     15 "MatZerr"           [U:1:108321727]     17:34       59    0 active 10.0.0.13:27005`

describe('parseStatus', () => {
  it('should parse player names and steam ids from status output', () => {
    const players = parseStatus(exampleStatusOutput)

    expect(players).toHaveLength(12)

    // Verify first player
    expect(players[0]).toEqual({
      name: 'dosu',
      steamId: '76561198147133692' as SteamId64,
    })

    // Verify player with special characters in name
    const kazachu = players.find(p => p.name === 'Kazachu 🐉')
    expect(kazachu).toBeDefined()
    expect(kazachu?.steamId).toBe('76561197992649727')

    // Verify player with spaces in name
    const samSung = players.find(p => p.name === 'sam sung el dzekson')
    expect(samSung).toBeDefined()
    expect(samSung?.steamId).toBe('76561198109161900')
  })

  it('should skip bot entries', () => {
    const players = parseStatus(exampleStatusOutput)

    // SourceTV is marked as BOT, should be skipped
    const sourceTV = players.find(p => p.name === 'SourceTV')
    expect(sourceTV).toBeUndefined()
  })

  it('should return empty array for empty input', () => {
    const players = parseStatus('')
    expect(players).toHaveLength(0)
  })

  it('should return empty array when no player lines are present', () => {
    const headerOnly = `hostname: serveme.tf #1526420
version : 10336138/24 10336138 secure
map     : cp_process_f12 at: 0 x, 0 y, 0 z
players : 0 humans, 0 bots (25 max)`

    const players = parseStatus(headerOnly)
    expect(players).toHaveLength(0)
  })

  it('should handle player names with special characters', () => {
    const statusWithSpecialChars = `# userid name                uniqueid            connected ping loss state  adr
#      3 "Player with (parens)"  [U:1:12345678]     20:51       60    0 active 10.0.0.1:27005
#      4 "Player with 'quotes'"  [U:1:23456789]     20:49       60    0 active 10.0.0.2:27005`

    const players = parseStatus(statusWithSpecialChars)

    expect(players).toHaveLength(2)
    expect(players[0]?.name).toBe('Player with (parens)')
    expect(players[1]?.name).toBe("Player with 'quotes'")
  })

  it('should correctly convert Steam3 ID to SteamId64', () => {
    // [U:1:186867964] should convert to 76561198147133692
    const statusSingle = `#      3 "TestPlayer"        [U:1:186867964]     20:51       60    0 active 10.0.0.1:27005`

    const players = parseStatus(statusSingle)

    expect(players).toHaveLength(1)
    expect(players[0]?.steamId).toBe('76561198147133692')
  })
})
