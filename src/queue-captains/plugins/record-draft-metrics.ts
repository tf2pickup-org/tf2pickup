import fp from 'fastify-plugin'
import { events } from '../../events'
import { draftDuration, draftPoolSize, draftTurns } from '../metrics'

/**
 * Operational health of the draft, per docs/observability.md: how long drafts take and how often a
 * turn had to be taken for a captain. A high timeout rate means the clock is too tight or captains
 * are drifting off — either way it is the number that says the format is not working.
 */
export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('queueCaptains/draft:started', ({ draft }) => {
      draftPoolSize.record(draft.pool.length)
    })

    events.on('queueCaptains/draft:completed', ({ draft }) => {
      draftDuration.record(Date.now() - draft.createdAt.getTime())

      for (const pick of draft.picks) {
        draftTurns.add(1, {
          phase: 'pick',
          kind: pick.auto ? 'timed out' : pick.forced ? 'forced' : 'chosen',
        })
      }

      for (const ban of draft.mapBans) {
        draftTurns.add(1, { phase: 'ban', kind: ban.auto ? 'timed out' : 'chosen' })
      }
    })
  },
  { name: 'record draft metrics' },
)
