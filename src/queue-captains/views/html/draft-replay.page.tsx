import { resolve } from 'node:path'
import { collections } from '../../../database/collections'
import type { DraftModel } from '../../../database/models/draft.model'
import type { GameNumber } from '../../../database/models/game.model'
import { errors } from '../../../errors'
import { Footer } from '../../../html/components/footer'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { IconCrown } from '../../../html/components/icons'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'
import { remainingMaps } from '../../draft/remaining-maps'

export async function DraftReplayPage(props: { gameNumber: GameNumber }) {
  const draft = await collections.queueCaptainsDrafts.findOne({ game: props.gameNumber })
  if (!draft) {
    throw errors.notFound(`game ${props.gameNumber} was not drafted`)
  }

  const name = (steamId: string) =>
    draft.pool.find(entry => entry.steamId === steamId)?.name ?? 'unknown'
  const picked = new Set(draft.picks.map(pick => pick.player))
  const unpicked = draft.pool.filter(
    entry => !picked.has(entry.steamId) && !Object.values(draft.captains).includes(entry.steamId),
  )

  return (
    <Layout
      title={makeTitle(`Draft for game #${props.gameNumber}`)}
      embedStyle={resolve(import.meta.dirname, 'draft-replay.page.css')}
    >
      <NavigationBar />
      <Page>
        <div class="container mx-auto flex flex-col gap-6">
          <div class="replay-head">
            <h1 class="replay-title">
              Draft for game{' '}
              <a href={`/games/${props.gameNumber}`} safe>
                #{props.gameNumber}
              </a>
            </h1>
            <span class="replay-sub">
              {draft.pool.length} in the pool · {draft.picks.length} picks · {draft.mapBans.length}{' '}
              bans
            </span>
          </div>

          <div class="replay-rule"></div>

          <div class="tablewrap">
            <table class="replay-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>Captain</th>
                  <th>Action</th>
                  <th>Elapsed</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="replay-num">—</td>
                  <td colspan="3">
                    <b>Pool frozen</b> · {draft.pool.length} players ·{' '}
                    <span safe>
                      {name(draft.captains.blu)} and {name(draft.captains.red)}
                    </span>{' '}
                    drawn as captains
                  </td>
                  <td class="replay-num">0:00</td>
                </tr>

                {draft.picks.map((pick, index) => (
                  <tr>
                    <td class="replay-num">{index + 1}</td>
                    <td>
                      <span class="replay-team" data-team={pick.team}>
                        {pick.team}
                      </span>
                    </td>
                    <td safe>{name(draft.captains[pick.team])}</td>
                    <td>
                      <span class="replay-pick">
                        <GameClassIcon gameClass={pick.gameClass} size={18} />
                        <b safe>{name(pick.player)}</b>
                        <span class="replay-class">{pick.gameClass}</span>
                        {!!pick.auto && <span class="replay-flag">timed out</span>}
                        {!!pick.forced && <span class="replay-flag">forced</span>}
                      </span>
                    </td>
                    <td class="replay-num" safe>
                      {elapsed(draft, pick.at)}
                    </td>
                  </tr>
                ))}

                {draft.mapBans.map(ban => (
                  <tr>
                    <td class="replay-num">—</td>
                    <td>
                      <span class="replay-team" data-team={ban.team}>
                        {ban.team}
                      </span>
                    </td>
                    <td safe>{name(draft.captains[ban.team])}</td>
                    <td>
                      banned <b safe>{ban.map}</b>
                      {!!ban.auto && <span class="replay-flag">timed out</span>}
                    </td>
                    <td class="replay-num" safe>
                      {elapsed(draft, ban.at)}
                    </td>
                  </tr>
                ))}

                <tr>
                  <td class="replay-num">—</td>
                  <td colspan="3">
                    Played on <b safe>{remainingMaps(draft)[0] ?? 'unknown'}</b>
                    {unpicked.length > 0 && (
                      <span class="replay-unpicked">
                        {' · '}
                        <span safe>{unpicked.map(entry => entry.name).join(', ')}</span>{' '}
                        {unpicked.length === 1 ? 'was' : 'were'} not picked
                      </span>
                    )}
                  </td>
                  <td class="replay-num" safe>
                    {lastAt(draft)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="replay-pool">
            <span class="replay-pool-title">Who signed up, and on what</span>
            <div class="replay-pool-grid">
              {draft.pool.map(entry => {
                const isCaptain = Object.values(draft.captains).includes(entry.steamId)
                return (
                  <div
                    class="replay-entry"
                    data-unpicked={`${!picked.has(entry.steamId) && !isCaptain}`}
                  >
                    <img src={entry.avatarUrl} width="32" height="32" alt="" loading="lazy" />
                    <a class="replay-name" href={`/players/${entry.steamId}`} safe>
                      {entry.name}
                    </a>
                    {isCaptain && (
                      <span class="replay-crown">
                        <IconCrown size={14} />
                        <span class="sr-only">captain</span>
                      </span>
                    )}
                    <span class="replay-classes">
                      {entry.gameClasses.map(gameClass => (
                        <GameClassIcon gameClass={gameClass} size={16} />
                      ))}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}

function elapsed(draft: DraftModel, at: Date): string {
  const ms = at.getTime() - draft.createdAt.getTime()
  const total = Math.max(Math.round(ms / 1000), 0)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function lastAt(draft: DraftModel): string {
  const last = [...draft.picks, ...draft.mapBans]
    .map(entry => entry.at)
    .sort()
    .at(-1)
  return last ? elapsed(draft, last) : '0:00'
}
