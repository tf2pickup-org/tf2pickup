import { nanoid } from 'nanoid'
import { minutesToMilliseconds } from 'date-fns'

export type PhaseStatus =
  | { status: 'pending' }
  | { status: 'running' }
  | { status: 'ok'; message?: string }
  | { status: 'fail'; message: string }

export interface HealthcheckResult {
  serverId: string
  status: 'running' | 'done'
  phases: {
    rconConnect: PhaseStatus
    rconCommand: PhaseStatus
    logRoundTrip: PhaseStatus
  }
}

const results = new Map<string, HealthcheckResult>()
const activeChecks = new Map<string, string>()

export function createCheck(serverId: string): string {
  const checkId = nanoid()
  results.set(checkId, {
    serverId,
    status: 'running',
    phases: {
      rconConnect: { status: 'pending' },
      rconCommand: { status: 'pending' },
      logRoundTrip: { status: 'pending' },
    },
  })
  activeChecks.set(serverId, checkId)
  setTimeout(() => {
    results.delete(checkId)
    if (activeChecks.get(serverId) === checkId) {
      activeChecks.delete(serverId)
    }
  }, minutesToMilliseconds(5))
  return checkId
}

export function getCheck(checkId: string): HealthcheckResult | undefined {
  return results.get(checkId)
}

export function getActiveCheckId(serverId: string): string | undefined {
  return activeChecks.get(serverId)
}

export function updatePhase(
  checkId: string,
  phase: keyof HealthcheckResult['phases'],
  status: PhaseStatus,
): void {
  const result = results.get(checkId)
  if (result === undefined) return
  result.phases[phase] = status
}

export function completeCheck(checkId: string): void {
  const result = results.get(checkId)
  if (result === undefined) return
  result.status = 'done'
  if (activeChecks.get(result.serverId) === checkId) {
    activeChecks.delete(result.serverId)
  }
}

/** Only for use in tests — clears all in-memory state */
export function _resetForTesting(): void {
  results.clear()
  activeChecks.clear()
}
