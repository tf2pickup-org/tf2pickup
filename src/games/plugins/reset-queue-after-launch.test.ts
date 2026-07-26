import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('fastify-plugin', () => ({ default: <T>(fn: T): T => fn }))
vi.mock('../../utils/safe', () => ({ safe: <T>(fn: T): T => fn }))

vi.mock('../../configuration', () => ({ configuration: { get: vi.fn() } }))
vi.mock('../../events', () => ({ events: { on: vi.fn() } }))
vi.mock('../../maps/apply-cooldown', () => ({ applyMapCooldown: vi.fn() }))
vi.mock('../../queue-auto/reset', () => ({ reset: vi.fn() }))
vi.mock('../../queue-captain/reset', () => ({ reset: vi.fn() }))

import plugin from './reset-queue-after-launch'
import { configuration } from '../../configuration'
import { events } from '../../events'
import { applyMapCooldown } from '../../maps/apply-cooldown'
import { reset as resetAutoQueue } from '../../queue-auto/reset'
import { reset as resetCaptainQueue } from '../../queue-captain/reset'

async function fireGameCreated() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (plugin as any)({}, {})
  const handler = vi
    .mocked(events.on)
    .mock.calls.find(([name]: [string]) => name === 'game:created')?.[1]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (handler as any)({ game: { map: 'cp_process_final' } })
}

describe('reset queue after launch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(configuration.get).mockResolvedValue('auto' as never)
  })

  // Regression: captain mode had its own auto-reset plugin that never applied
  // the cooldown, so drafted maps could come straight back around.
  it('applies the map cooldown regardless of queue mode', async () => {
    vi.mocked(configuration.get).mockResolvedValue('captain' as never)

    await fireGameCreated()

    expect(applyMapCooldown).toHaveBeenCalledWith('cp_process_final')
  })

  it('resets the auto queue in auto mode', async () => {
    await fireGameCreated()

    expect(resetAutoQueue).toHaveBeenCalled()
    expect(resetCaptainQueue).not.toHaveBeenCalled()
  })

  it('resets the captain queue in captain mode', async () => {
    vi.mocked(configuration.get).mockResolvedValue('captain' as never)

    await fireGameCreated()

    expect(resetCaptainQueue).toHaveBeenCalled()
    expect(resetAutoQueue).not.toHaveBeenCalled()
  })
})
