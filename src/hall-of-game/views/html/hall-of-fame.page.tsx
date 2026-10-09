import { Gamemode } from '../../../shared/types/gamemode'
import { resolve } from 'node:path'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'
import { collections } from '../../../database/collections'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import type { PlayerModel } from '../../../database/models/player.model'
import { playerAvatarUrl } from '../../../shared/player-avatar-url'
import { IconAwardFilled } from '../../../html/components/icons'
import { makeTitle } from '../../../html/make-title'

interface HallOfFameEntry {
  player: PlayerModel
  count: number
}

export async function HallOfFamePage() {
  const [all, medics] = await Promise.all([getMostActiveOverall(), getMostActiveMedics()])

  return (
    <Layout
      title={makeTitle('Hall of fame')}
      description="Hall of fame"
      canonical="/hall-of-fame"
      embedStyle={resolve(import.meta.dirname, 'hall-of-fame.page.css')}
    >
      <NavigationBar wide />
      <Page>
        <div class="page-wide">
          <h1 class="page-title">Hall of Fame</h1>

          <div class="hof-boards">
            <Board title="All classes" entries={all} />
            <Board title="Medics" entries={medics} />
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}

function Board(props: { title: string; entries: HallOfFameEntry[] }) {
  return (
    <div class="hof-board">
      <h2 class="title" safe>
        {props.title}
      </h2>
      {props.entries.map((record, i) => (
        <a class="hof-record" href={`/players/${record.player.steamId}`} preload="mousedown">
          <MaybeAward i={i} />
          <img
            src={playerAvatarUrl(record.player.avatar, 'medium')}
            width="38"
            height="38"
            alt={`${record.player.name}'s avatar`}
          />
          <span class="name" safe>
            {record.player.name}
          </span>
          <span class="count">{record.count}</span>
        </a>
      ))}
    </div>
  )
}

function MaybeAward(props: { i: number }) {
  switch (props.i) {
    case 0:
      return <IconAwardFilled size={32} class="text-place-1st place-self-center"></IconAwardFilled>
    case 1:
      return <IconAwardFilled size={32} class="text-place-2nd place-self-center"></IconAwardFilled>
    case 2:
      return <IconAwardFilled size={32} class="text-place-3rd place-self-center"></IconAwardFilled>
    default:
      return <span class="text-center">{props.i + 1}.</span>
  }
}

async function getMostActiveOverall(): Promise<HallOfFameEntry[]> {
  const players = await collections.players
    .find({ 'stats.totalGames': { $gt: 0 } }, { sort: { 'stats.totalGames': -1 }, limit: 10 })
    .toArray()
  return players.map(player => ({ player, count: player.stats.totalGames }))
}

// medic games across every gamemode
async function getMostActiveMedics(): Promise<HallOfFameEntry[]> {
  return await collections.players
    .aggregate<HallOfFameEntry>([
      {
        $set: {
          medicGames: {
            $sum: Object.values(Gamemode).map(
              gamemode => `$stats.gamesByClass.${gamemode}.${Tf2ClassName.medic}`,
            ),
          },
        },
      },
      { $match: { medicGames: { $gt: 0 } } },
      { $sort: { medicGames: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, player: '$$ROOT', count: '$medicGames' } },
    ])
    .toArray()
}
