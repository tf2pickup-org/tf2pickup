import type { SkillConflict } from '../../types'
import { queue } from '../../../../queue'

interface ImportConflictDialogProps {
  conflict: SkillConflict
  remainingCount: number
  conflicts: SkillConflict[]
}

export function ImportConflictDialog({
  conflict,
  remainingCount,
  conflicts,
}: ImportConflictDialogProps) {
  const classes = queue.config.classes.map(({ name }) => name)
  const steamProfileUrl = `https://steamcommunity.com/profiles/${conflict.steamId}`
  const conflictsJson = encodeURIComponent(JSON.stringify(conflicts))

  return (
    <div class="bg-abru-dark-25 rounded-2xl p-8" id="conflict-dialog">
      <h2 class="text-abru-light-75 mb-4 text-xl font-bold">Skill Conflict</h2>

      <div class="mb-6 flex flex-col gap-2">
        <p class="text-abru-light-50">
          Player{' '}
          <a
            href={steamProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-accent-500 font-bold hover:underline"
            safe
          >
            {conflict.playerName}
          </a>{' '}
          already has a skill assigned. Would you like to override it?
        </p>
        <p class="text-abru-light-50 text-sm">
          Steam ID:{' '}
          <code class="text-abru-light-75" safe>
            {conflict.steamId}
          </code>
        </p>
      </div>

      <div class="mb-6 grid grid-cols-3 gap-4">
        <div></div>
        <div class="text-abru-light-50 text-sm font-bold">Current</div>
        <div class="text-abru-light-50 text-sm font-bold">Imported</div>

        {classes.map(className => {
          const current = conflict.currentSkill[className]
          const imported = conflict.importedSkill[className]
          const hasChange = current !== imported && imported !== undefined

          return (
            <>
              <div class="text-abru-light-75 capitalize">{className}</div>
              <div class={['font-mono', hasChange ? 'text-abru-light-50' : 'text-abru-light-75']}>
                {current ?? '—'}
              </div>
              <div
                class={[
                  'font-mono',
                  hasChange ? 'text-green-400 font-bold' : 'text-abru-light-75',
                ]}
              >
                {imported ?? '—'}
              </div>
            </>
          )
        })}
      </div>

      <div class="text-abru-light-50 mb-6 text-sm">
        {remainingCount > 0 ? (
          <span>
            <strong class="text-abru-light-75">{remainingCount}</strong> more conflict(s) to
            resolve.
          </span>
        ) : (
          <span>This is the last conflict.</span>
        )}
      </div>

      <div class="flex flex-wrap gap-2">
        <form method="post" action="/admin/skill-import-export/resolve" class="contents">
          <input type="hidden" name="action" value="ignore" />
          <input type="hidden" name="steamId" value={conflict.steamId} />
          <input type="hidden" name="conflicts" value={conflictsJson} />
          <button type="submit" class="button button--darker">
            Ignore
          </button>
        </form>

        {remainingCount > 0 && (
          <form method="post" action="/admin/skill-import-export/resolve" class="contents">
            <input type="hidden" name="action" value="ignore-all" />
            <input type="hidden" name="conflicts" value={conflictsJson} />
            <button type="submit" class="button button--darker">
              Ignore all
            </button>
          </form>
        )}

        <form method="post" action="/admin/skill-import-export/resolve" class="contents">
          <input type="hidden" name="action" value="override" />
          <input type="hidden" name="steamId" value={conflict.steamId} />
          <input
            type="hidden"
            name="skill"
            value={JSON.stringify(conflict.importedSkill)}
          />
          <input type="hidden" name="conflicts" value={conflictsJson} />
          <button type="submit" class="button button--accent">
            Override
          </button>
        </form>

        {remainingCount > 0 && (
          <form method="post" action="/admin/skill-import-export/resolve" class="contents">
            <input type="hidden" name="action" value="override-all" />
            <input type="hidden" name="conflicts" value={conflictsJson} />
            <button type="submit" class="button button--accent">
              Override skills for {remainingCount + 1} players
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
