import { GameClassIcon } from '../../../html/components/game-class-icon'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { getReadiness } from '../../get-readiness'

export async function ReadinessMeter() {
  const readiness = await getReadiness()
  const percent = Math.round((readiness.fillable / readiness.required) * 100)
  const captainsShort = readiness.captainVolunteers < readiness.captainsNeeded

  return (
    <div class="readiness-meter" id="readiness-meter" data-full={`${readiness.isFull}`}>
      <div class="readiness-top">
        <span class="readiness-title">{readiness.isFull ? 'Ready to draft' : 'Filling up'}</span>
        <span class="readiness-count">
          {readiness.fillable}
          <small> / {readiness.required} slots</small>
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

      <div class="readiness-foot">
        <span>
          <b>{readiness.poolSize}</b> {readiness.poolSize === 1 ? 'player' : 'players'} in pool
        </span>
        <span class="readiness-sep">·</span>
        <span>
          <b>{readiness.captainVolunteers}</b>{' '}
          {readiness.captainVolunteers === 1 ? 'captain' : 'captains'}{' '}
          {captainsShort ? (
            <span class="readiness-miss">needs {readiness.captainsNeeded}</span>
          ) : (
            <span class="readiness-ok">✓</span>
          )}
        </span>
      </div>

      {readiness.missing.length > 0 && (
        <div class="readiness-missing">
          <span>Still missing</span>
          {missingByClass(readiness.missing).map(([gameClass, count]) => (
            <span class="readiness-need">
              <GameClassIcon gameClass={gameClass} size={18} />
              {count}× {gameClass}
            </span>
          ))}
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
