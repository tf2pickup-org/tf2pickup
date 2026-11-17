import { afterEach, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { secondsToMilliseconds } from 'date-fns'
import { QueueState } from '../../../../database/models/queue-state.model'
import type { PoolView } from '../../types/pool-view'
import { CaptainReadyStatus } from './captain-ready-status'

const startedAt = new Date('2026-11-17T12:00:00Z')
const readyPhase = {
  token: 'round',
  startedAt,
  readyUpDeadline: new Date(startedAt.getTime() + secondsToMilliseconds(40)),
  deadline: new Date(startedAt.getTime() + secondsToMilliseconds(60)),
}
const view = { state: QueueState.ready, readyPhase } as PoolView

afterEach(() => vi.useRealTimers())

it('renders the persisted countdown and progress timestamps when reconnecting mid-ready', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(startedAt.getTime() + secondsToMilliseconds(15)))
  const html = parse(String(CaptainReadyStatus({ view })))
  expect(html.textContent).toContain('0:45')
  expect(html.textContent).toContain('READY UP!')
  expect(html.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite')
  expect(html.querySelector('[data-countdown]')?.getAttribute('aria-hidden')).toBe('true')
  expect(html.querySelector('[data-phase-timer]')?.getAttribute('data-phase-start')).toBe(
    String(startedAt.getTime()),
  )
  expect(html.querySelector('[data-phase-timer]')?.getAttribute('data-phase-deadline')).toBe(
    String(readyPhase.deadline.getTime()),
  )
})

it.each([QueueState.waiting, QueueState.drafting, QueueState.banningMaps])(
  'keeps an empty OOB target after leaving ready for %s',
  state => {
    const html = parse(String(CaptainReadyStatus({ view: { ...view, state } })))
    expect(html.querySelector('#captain-ready-status')?.textContent).toBe('')
    expect(html.querySelector('[data-phase-timer]')).toBeNull()
  },
)
