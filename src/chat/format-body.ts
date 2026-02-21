import linkifyHtml from 'linkify-html'
import type { SteamId64 } from '../shared/types/steam-id-64'

const linkifyOptions = {
  attributes: {
    rel: 'noreferrer noopener',
  },
  target: '_blank',
} as const

const mentionTagPattern = /@<(\d{17})>/g

export function formatBody(originalBody: string, mentionNames?: Map<SteamId64, string>): string {
  let body = originalBody

  if (mentionNames && mentionNames.size > 0) {
    body = body.replace(mentionTagPattern, (_match, steamId: string) => {
      const name = mentionNames.get(steamId as SteamId64)
      if (name) {
        return `<a href="/players/${steamId}" class="mention">@${name}</a>`
      }
      return _match
    })
  }

  return linkifyHtml(body, linkifyOptions)
}
