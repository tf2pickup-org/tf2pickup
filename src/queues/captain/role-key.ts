import type { CaptainRole } from './types/captain-role'

export function roleKey(role: CaptainRole): string {
  return `${role.gameClass}:${role.name}`
}
