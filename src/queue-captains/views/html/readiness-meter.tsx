import { GameClassIcon } from '../../../html/components/game-class-icon'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { getReadiness } from '../../get-readiness'

export async function ReadinessMeter() {
  const readiness = await getReadiness()
  const percent = Math.round((readiness.fillable / readiness.required) * 100)
  const captainsShort = readiness.captainVolunteers < readiness.captainsNeeded

  return (
    <div
      class="captains-panel readiness-meter"
      id="readiness-meter"
      data-full={`${readiness.isFull}`}
    >
      <div class="readiness-top">
        <h3 class="readiness-count">
          Slots: {readiness.fillable}/{readiness.required}
        </h3>
        <span class="readiness-status">
          {readiness.isFull ? 'Ready to draft' : 'Waiting for players'}
        </span>
      </div>

      <div
        class="readiness-bar"
        role="progressbar"
        aria-valuenow={readiness.fillable}
        aria-valuemin="0"
        aria-valuemax={readiness.required}
        aria-label="Slots the queue can fill"
      >
        <span style={`width: ${percent}%`}></span>
      </div>

      <div class="readiness-detail">
        <span>
          <b>{readiness.poolSize}</b> {readiness.poolSize === 1 ? 'player' : 'players'} in the pool
        </span>
        <span>
          <b>{readiness.captainVolunteers}</b> of <b>{readiness.captainsNeeded}</b> captains
        </span>
      </div>

      {(readiness.missing.length > 0 || captainsShort) && (
        <div class="readiness-missing">
          {missingByClass(readiness.missing).map(([gameClass, count]) => (
            <span class="readiness-need">
              <GameClassIcon gameClass={gameClass} size={20} />
              {count} {gameClass}
            </span>
          ))}
          {captainsShort && (
            <span class="readiness-need">
              {readiness.captainsNeeded - readiness.captainVolunteers} more captain
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function missingByClass(missing: Tf2ClassName[]): [Tf2ClassName, number][] {
  const counts = new Map<Tf2ClassName, number>()
  for (const gameClass of missing) {
    counts.set(gameClass, (counts.get(gameClass) ?? 0) + 1)
  }
  return [...counts.entries()]
}
