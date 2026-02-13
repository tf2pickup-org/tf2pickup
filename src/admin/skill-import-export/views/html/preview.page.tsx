import type { ImportAnalysis } from '../../types'
import { Admin } from '../../../views/html/admin'
import type { PlayerSkill } from '../../../../database/models/player.model'
import { config } from '../../../../queue/config'

interface PreviewPageProps {
  analysis: ImportAnalysis
}

export function PreviewPage({ analysis }: PreviewPageProps) {
  const classNames = config.classes.map(c => c.name)
  const totalChanges =
    analysis.changedPlayers.length +
    analysis.initializedPlayers.length +
    analysis.futurePlayers.length

  return (
    <Admin activePage="skill-import-export">
      <div class="admin-panel-set flex flex-col gap-6">
        <header class="flex flex-row items-center justify-between">
          <h2 class="text-lg font-bold">Import preview</h2>
          <a href="/admin/skill-import-export" class="button button--dense">
            Cancel
          </a>
        </header>

        <div class="grid grid-cols-4 gap-4 text-center">
          <div class="bg-abru-dark-29 rounded p-4">
            <div class="text-2xl font-bold text-yellow-400">{analysis.changedPlayers.length}</div>
            <div class="text-abru-light-75 text-sm">Changed</div>
          </div>
          <div class="bg-abru-dark-29 rounded p-4">
            <div class="text-2xl font-bold text-green-400">
              {analysis.initializedPlayers.length}
            </div>
            <div class="text-abru-light-75 text-sm">Initialized</div>
          </div>
          <div class="bg-abru-dark-29 rounded p-4">
            <div class="text-abru-light-75 text-2xl font-bold">{analysis.unaffectedCount}</div>
            <div class="text-abru-light-75 text-sm">Unaffected</div>
          </div>
          <div class="bg-abru-dark-29 rounded p-4">
            <div class="text-2xl font-bold text-blue-400">{analysis.futurePlayers.length}</div>
            <div class="text-abru-light-75 text-sm">Future</div>
          </div>
        </div>

        {analysis.changedPlayers.length > 0 && (
          <section>
            <h3 class="text-md mb-2 font-bold text-yellow-400">Changed players</h3>
            <p class="text-abru-light-75 mb-2 text-sm">
              These players will have their skills updated.
            </p>
            <PlayerSkillTable
              players={analysis.changedPlayers.map(p => ({
                steamId: p.steamId,
                name: p.name,
                profileUrl: p.profileUrl,
                oldSkill: p.oldSkill,
                newSkill: p.newSkill,
              }))}
              classNames={classNames}
              showOldSkill={true}
            />
          </section>
        )}

        {analysis.initializedPlayers.length > 0 && (
          <section>
            <h3 class="text-md mb-2 font-bold text-green-400">Initialized players</h3>
            <p class="text-abru-light-75 mb-2 text-sm">
              These players don't have skills yet and will be initialized.
            </p>
            <PlayerSkillTable
              players={analysis.initializedPlayers.map(p => ({
                steamId: p.steamId,
                name: p.name,
                profileUrl: p.profileUrl,
                newSkill: p.newSkill,
              }))}
              classNames={classNames}
              showOldSkill={false}
            />
          </section>
        )}

        {analysis.futurePlayers.length > 0 && (
          <section>
            <h3 class="text-md mb-2 font-bold text-blue-400">Future players</h3>
            <p class="text-abru-light-75 mb-2 text-sm">
              These players aren't registered yet. Their skills will be saved and applied when they
              register.
            </p>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-abru-dark-29 border-b">
                  <th class="p-2 text-left">Steam ID</th>
                  <th class="p-2 text-left">Name (from CSV)</th>
                  {classNames.map(c => (
                    <th class="p-2 text-center capitalize">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.futurePlayers.map(p => (
                  <tr class="border-abru-dark-29 border-b">
                    <td class="p-2 font-mono text-xs">{p.steamId as 'safe'}</td>
                    <td class="p-2">
                      {p.name ? (
                        <span safe>{p.name}</span>
                      ) : (
                        <span class="text-abru-light-50">-</span>
                      )}
                    </td>
                    {classNames.map(c => (
                      <td class="p-2 text-center">
                        {p.skill[c] !== undefined ? (
                          <span class="text-blue-400">{p.skill[c]}</span>
                        ) : (
                          <span class="text-abru-light-50">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {totalChanges > 0 ? (
          <form action="/admin/skill-import-export/apply" method="post">
            <button type="submit" class="button button--accent">
              Apply {totalChanges} change{totalChanges !== 1 ? 's' : ''}
            </button>
          </form>
        ) : (
          <p class="text-abru-light-75">No changes to apply.</p>
        )}
      </div>
    </Admin>
  )
}

interface PlayerTableRow {
  steamId: string
  name: string
  profileUrl: string
  oldSkill?: PlayerSkill
  newSkill: PlayerSkill
}

interface PlayerSkillTableProps {
  players: PlayerTableRow[]
  classNames: string[]
  showOldSkill: boolean
}

function PlayerSkillTable({ players, classNames, showOldSkill }: PlayerSkillTableProps) {
  return (
    <table class="w-full text-sm">
      <thead>
        <tr class="border-abru-dark-29 border-b">
          <th class="p-2 text-left">Player</th>
          {classNames.map(c => (
            <th class="p-2 text-center capitalize">{c as 'safe'}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {players.map(p => (
          <tr class="border-abru-dark-29 border-b">
            <td class="p-2">
              <a href={p.profileUrl} class="text-accent hover:underline" safe>
                {p.name}
              </a>
            </td>
            {classNames.map(c => {
              const oldVal = showOldSkill ? p.oldSkill?.[c as keyof PlayerSkill] : undefined
              const newVal = p.newSkill[c as keyof PlayerSkill]
              const changed = showOldSkill && oldVal !== newVal

              return (
                <td class="p-2 text-center">
                  {changed ? (
                    <>
                      <span class="text-red-400 line-through">{oldVal}</span>
                      <span class="mx-1">→</span>
                      <span class="text-green-400">{newVal}</span>
                    </>
                  ) : newVal !== undefined ? (
                    <span>{newVal}</span>
                  ) : (
                    <span class="text-abru-light-50">-</span>
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
