import type { DraftPick } from '../types/draft-pick'

// The legal picks of each running draft's current position, by queue id. A draft's pool is
// locked, so the picks only change when a pick is made, which is part of the key.
export const legalPicksCache = new Map<string, { key: string; legal: DraftPick[] }>()
