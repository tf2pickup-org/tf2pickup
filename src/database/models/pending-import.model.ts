import type { ImportAnalysis } from '../../admin/skill-import-export/types'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface PendingImportModel {
  actor: SteamId64
  analysis: ImportAnalysis
  createdAt: Date
}
