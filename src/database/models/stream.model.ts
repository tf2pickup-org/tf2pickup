import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface StreamModel {
  player?: SteamId64
  id: string
  userName: string
  title: string
  thumbnailUrl: string
  viewerCount: number
}
