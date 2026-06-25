import type { ServerConfigOption } from './server-config-option'
import type { ServerOption } from './server-option'
import type { WhitelistOption } from './whitelist-option'

export interface ReservationOptions {
  servers: ServerOption[]
  serverConfigs: ServerConfigOption[]
  whitelists: WhitelistOption[]
}
