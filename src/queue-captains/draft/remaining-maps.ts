import type { DraftModel } from '../../database/models/draft.model'

export function remainingMaps(draft: DraftModel): string[] {
  const banned = new Set(draft.mapBans.map(ban => ban.map))
  return draft.mapOptions.filter(map => !banned.has(map))
}
