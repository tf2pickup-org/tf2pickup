import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendTelemetry } from './send-telemetry'
import { environment } from '../environment'
import { logger } from '../logger'

vi.mock('../environment', () => ({
  environment: {
    TELEMETRY_URL: 'https://telemetry.tf2pickup.org',
    TELEMETRY_DISABLED: false,
  },
}))

vi.mock('../logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}))

vi.mock('./build-snapshot', () => ({
  buildSnapshot: vi.fn().mockResolvedValue({ instanceId: 'deadbeef', queueConfig: '6v6' }),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue({ ok: true, status: 204 })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('when telemetry is disabled', () => {
  beforeEach(() => {
    environment.TELEMETRY_DISABLED = true
  })

  afterEach(() => {
    environment.TELEMETRY_DISABLED = false
  })

  it('should not send anything', async () => {
    await sendTelemetry()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('when telemetry is enabled', () => {
  it('should send the snapshot unauthenticated', async () => {
    await sendTelemetry()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url.toString()).toBe('https://telemetry.tf2pickup.org/api/telemetry')
    expect(init.method).toBe('PUT')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.headers).not.toHaveProperty('Authorization')
    expect(JSON.parse(init.body)).toEqual({ instanceId: 'deadbeef', queueConfig: '6v6' })
  })

  describe('and the report is rejected', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({ ok: false, status: 429 })
    })

    it('should log a warning and not throw', async () => {
      await expect(sendTelemetry()).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalledWith({ status: 429 }, 'telemetry rejected')
    })
  })
})
