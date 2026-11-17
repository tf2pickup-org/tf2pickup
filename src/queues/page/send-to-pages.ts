import type { Gateway } from '../../websocket/gateway'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { fetchActors, type QueuePageActor } from './fetch-actors'
import { renderFragments } from './render-fragments'

export interface Viewer {
  steamId: SteamId64 | undefined
  actor: () => Promise<QueuePageActor | undefined>
}

// renders nothing when its target is not on this viewer's page
type Html = string | false | undefined
export type Fragment = (viewer: Viewer) => Html | Promise<Html>

export function sendToPages(
  gateway: Gateway,
  urls: string[],
  fragments: Fragment[],
  players?: SteamId64[],
) {
  if (urls.length === 0 || fragments.length === 0) {
    return
  }

  const pages = gateway.to({ urls })
  const target = players ? pages.to({ players }) : pages
  let actors: Promise<Map<SteamId64, QueuePageActor>> | undefined
  const viewer = (steamId: SteamId64 | undefined): Viewer => ({
    steamId,
    actor: async () =>
      steamId ? (await (actors ??= fetchActors(target.players()))).get(steamId) : undefined,
  })

  target.send(steamId => renderFragments(fragments, viewer(steamId)))
}
