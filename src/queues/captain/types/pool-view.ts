import type { CaptainPoolModel } from '../../../database/models/captain-pool.model'
import type { QueueState } from '../../../database/models/queue-state.model'
import type { poolReadiness } from '../pool-readiness'

export interface PoolView {
  state: QueueState
  // every member, locked draft members included
  members: CaptainPoolModel[]
  // the members the page counts: everybody, but while a draft runs only the next game's sign-ups
  pool: CaptainPoolModel[]
  readiness: ReturnType<typeof poolReadiness>
}
