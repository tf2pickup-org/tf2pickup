import type { CaptainPoolModel } from '../../../database/models/captain-pool.model'
import type { QueueState } from '../../../database/models/queue-state.model'
import type { poolReadiness } from '../pool-readiness'
import type { DraftView } from './draft-view'
import type { ReadyPhase } from './ready-phase'

export interface PoolView {
  state: QueueState
  readyPhase?: ReadyPhase | undefined
  // every member, locked draft members included
  members: CaptainPoolModel[]
  // the members the page counts: everybody, but while a draft runs only the next game's sign-ups
  pool: CaptainPoolModel[]
  readiness: ReturnType<typeof poolReadiness>
  // while a draft runs
  draft?: DraftView | undefined
}
