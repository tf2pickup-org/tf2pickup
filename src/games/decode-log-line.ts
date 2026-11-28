import { parse } from 'date-fns'
import SteamID from 'steamid'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2Team } from '../shared/types/tf2-team'

export type LogLineEvent =
  | { type: 'round start'; at: Date }
  | { type: 'round win'; winner: Tf2Team }
  | { type: 'round stalemate' }
  | { type: 'round length'; lengthMs: number }
  | { type: 'game over' }
  | { type: 'logs uploaded'; logsUrl: string }
  | { type: 'player connected'; steamId: SteamId64; ipAddress: string }
  | { type: 'player joined team'; steamId: SteamId64; team: Tf2Team }
  | { type: 'player disconnected'; steamId: SteamId64 }
  | { type: 'score reported'; team: Tf2Team; score: number }
  | { type: 'final score reported'; team: Tf2Team; score: number }
  | { type: 'point captured'; team: Tf2Team; controlPoint: number }
  | { type: 'demo uploaded'; demoUrl: string }
  | { type: 'player said'; steamId: SteamId64; message: string }
  // a known line whose player has an invalid steam id
  | { type: 'invalid player' }

// converts 'Red' and 'Blue' to valid team names
// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment
const fixTeamName = (teamName: string): Tf2Team => teamName.toLowerCase().substring(0, 3) as Tf2Team

const toSteamId64 = (steamId: string): SteamId64 | null => {
  try {
    const id = new SteamID(steamId)
    return id.isValid() ? (id.getSteamID64() as SteamId64) : null
  } catch {
    return null
  }
}

const decoders: [RegExp, (matches: RegExpMatchArray) => LogLineEvent | null][] = [
  [
    /^(\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}):\sWorld triggered "Round_Start"$/,
    ([, timestamp]) => ({
      type: 'round start',
      at: parse(timestamp!, 'MM/dd/yyyy - HH:mm:ss', new Date()),
    }),
  ],
  [
    // https://regex101.com/r/41LfKS/2
    /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Win" \(winner "(.+)"\)$/,
    ([, winner]) => ({ type: 'round win', winner: fixTeamName(winner!) }),
  ],
  [
    /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "Round_Stalemate"$/,
    () => ({ type: 'round stalemate' }),
  ],
  [
    // payload/attack-defend maps emit "Mini_Round_Length" instead of "Round_Length"
    // https://regex101.com/r/mvOYMz/3
    /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\sWorld triggered "(?:Mini_)?Round_Length" \(seconds "([\d.]+)"\)$/,
    ([, seconds]) => ({ type: 'round length', lengthMs: parseFloat(seconds!) * 1000 }),
  ],
  [/^[\d/\s-:]+World triggered "Game_Over" reason ".*"$/, () => ({ type: 'game over' })],
  [
    /^[\d/\s-:]+\[TFTrue\].+\shttp:\/\/logs\.tf\/(\d+)\..*$/,
    ([, logId]) => ({ type: 'logs uploaded', logsUrl: `http://logs.tf/${logId}` }),
  ],
  [
    // https://regex101.com/r/uyPW8m/5
    /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><>"\sconnected,\saddress\s"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})"$/,
    matches => {
      const steamId = toSteamId64(matches[5]!)
      return steamId && { type: 'player connected', steamId, ipAddress: matches[6]! }
    },
  ],
  [
    // https://regex101.com/r/yzX9zG/1
    /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.+)>"\sjoined\steam\s"(.+)"/,
    matches => {
      const steamId = toSteamId64(matches[5]!)
      return steamId && { type: 'player joined team', steamId, team: fixTeamName(matches[7]!) }
    },
  ],
  [
    // https://regex101.com/r/x4AMTG/1
    /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.[^>]+)>"\sdisconnected\s\(reason\s"(.[^"]+)"\)$/,
    matches => {
      const steamId = toSteamId64(matches[5]!)
      return steamId && { type: 'player disconnected', steamId }
    },
  ],
  [
    // https://regex101.com/r/ZD6eLb/1
    /^[\d/\s\-:]+Team "(.[^"]+)" current score "(\d)" with "(\d)" players$/,
    ([, team, score]) => ({
      type: 'score reported',
      team: fixTeamName(team!),
      score: Number(score),
    }),
  ],
  [
    // https://regex101.com/r/RAUdTe/1
    /^[\d/\s\-:]+Team "(.[^"]+)" final score "(\d)" with "(\d)" players$/,
    ([, team, score]) => ({
      type: 'final score reported',
      team: fixTeamName(team!),
      score: Number(score),
    }),
  ],
  [
    // https://regex101.com/r/3fJZ4r/1
    /^[\d/\s\-:]+Team "(.[^"]+)" triggered "pointcaptured" \(cp "(\d+)"\)/,
    ([, team, controlPoint]) => ({
      type: 'point captured',
      team: fixTeamName(team!),
      controlPoint: Number(controlPoint),
    }),
  ],
  [
    // https://regex101.com/r/JLGRYa/2
    /^[\d/\s-:]+\[demos\.tf\]:\sSTV\savailable\sat:\s(.+)$/,
    ([, demoUrl]) => ({ type: 'demo uploaded', demoUrl: demoUrl! }),
  ],
  [
    // https://regex101.com/r/zpFkkA/1
    /^(\d{2}\/\d{2}\/\d{4})\s-\s(\d{2}:\d{2}:\d{2}):\s"(.+)<(\d+)><(\[.[^\]]+\])><(.[^>]+)>"\ssay\s"(.+)"$/,
    matches => {
      const steamId = toSteamId64(matches[5]!)
      return steamId && { type: 'player said', steamId, message: matches[7]! }
    },
  ],
]

// Decodes a TF2 log line (without the leading "L ") into a typed event; the
// first matching line shape wins. Returns null for lines no shape matches.
export function decodeLogLine(line: string): LogLineEvent | null {
  for (const [regex, decode] of decoders) {
    const matches = line.match(regex)
    if (matches) {
      return decode(matches) ?? { type: 'invalid player' }
    }
  }
  return null
}
