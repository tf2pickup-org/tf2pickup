import { resolve } from 'node:path'
import type { User } from '../../../auth/types/user'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'
import { collections } from '../../../database/collections'
import { GameState } from '../../../database/models/game.model'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import type { PlayerModel } from '../../../database/models/player.model'
import { IconAwardFilled } from '../../../html/components/icons'

interface HallOfFameEntry {
  player: PlayerModel
  count: number
}

export async function HallOfFamePage(props: { user?: User | undefined }) {
  const [all, medics] = await Promise.all([getMostActiveOverall(), getMostActiveMedics()])

  return (
    <Layout title="Hall of fame" embedStyle={resolve(import.meta.dirname, 'hall-of-fame.page.css')}>
      <NavigationBar user={props.user} />
      <Page>
        <div class="container mx-auto grid grid-cols-1 gap-x-4 gap-y-2 p-2 lg:grid-cols-2 lg:gap-y-0 lg:p-0">
          <div class="my-9 text-[48px] font-bold text-abru-light-75 lg:col-span-2">
            Hall of Fame
          </div>

          <Board title="All classes" entries={all} />
          <Board title="Medics" entries={medics} />
        </div>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}

function Board(props: { title: string; entries: HallOfFameEntry[] }) {
  return (
    <div class="hof-board">
      <div class="title col-span-4" safe>
        {props.title}
      </div>
      {props.entries.map((record, i) => (
        <>
          <a class="hof-record" href={`/players/${record.player.steamId}`}>
            <MaybeAward i={i} />
            <img
              src={record.player.avatar.medium}
              width="64"
              height="64"
              class="h-[38px] w-[38px]"
              alt="{name}'s avatar"
            />
            <span safe>{record.player.name}</span>
            <span class="justify-self-end">{record.count}</span>
          </a>
        </>
      ))}
    </div>
  )
}

function MaybeAward(props: { i: number }) {
  switch (props.i) {
    case 0:
      return <IconAwardFilled size={32} class="place-self-center text-place-1st"></IconAwardFilled>
    case 1:
      return <IconAwardFilled size={32} class="place-self-center text-place-2nd"></IconAwardFilled>
    case 2:
      return <IconAwardFilled size={32} class="place-self-center text-place-3rd"></IconAwardFilled>
    default:
      return <span class="place-self-center">{props.i + 1}.</span>
  }
}

async function getMostActiveOverall(): Promise<HallOfFameEntry[]> {
  return await collections.games
    .aggregate<HallOfFameEntry>([
      { $match: { state: GameState.ended } },
      { $unwind: '$slots' },
      { $group: { _id: '$slots.player', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: '_id',
          as: 'player',
        },
      },
      {
        $project: {
          count: 1,
          player: {
            $arrayElemAt: ['$player', 0],
          },
        },
      },
    ])
    .toArray()
}

async function getMostActiveMedics(): Promise<HallOfFameEntry[]> {
  return await collections.games
    .aggregate<HallOfFameEntry>([
      { $match: { state: GameState.ended } },
      { $unwind: '$slots' },
      { $match: { 'slots.gameClass': Tf2ClassName.medic } },
      { $group: { _id: '$slots.player', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: '_id',
          as: 'player',
        },
      },
      {
        $project: {
          count: 1,
          player: {
            $arrayElemAt: ['$player', 0],
          },
        },
      },
    ])
    .toArray()
}
