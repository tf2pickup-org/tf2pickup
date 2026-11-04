import { getPrivileges } from './get-privileges'
import { getStatus } from './status'

export const mumble = {
  getPrivileges,
  getStatus,
} as const
