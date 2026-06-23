import { resolve } from 'node:path'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Layout } from '../../../html/layout'
import type { PlayerModel } from '../../../database/models/player.model'
import { deburr } from 'es-toolkit'
import { collections } from '../../../database/collections'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'
import { makeTitle } from '../../../html/make-title'

const latin = Array.from(Array(26)).map((_e, i) => String.fromCharCode(i + 65))

export async function PlayerListPage() {
  const players = await collections.players
    .find<
      Pick<PlayerModel, 'steamId' | 'name'>
    >({}, { projection: { _id: 0, steamId: 1, name: 1 } })
    .toArray()
  const groupedPlayers = groupPlayers(players)

  // Append non-Latin letters (e.g. Cyrillic) only when this instance's players use them.
  const extraGroups = Array.from(groupedPlayers.keys())
    .filter(key => key !== '#' && !latin.includes(key))
    .sort((a, b) => a.localeCompare(b))
  const groups = ['#', ...latin, ...extraGroups]

  return (
    <Layout
      title={makeTitle('players')}
      description="player list"
      canonical="/players"
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar />
      <Page>
        <div class="container mx-auto">
          <div class="text-abru-light-75 my-9 text-[48px] font-bold">Players</div>

          <div class="text-abru-light-75 hidden flex-row flex-wrap justify-between gap-x-3 gap-y-1 text-2xl font-bold md:flex">
            {groups.map(letter => (
              <a href={`#${letter}`} style="uppercase" safe>
                {letter}
              </a>
            ))}
          </div>

          {groups.map(letter => (
            <>
              <div class="bg-abru-light-15 my-4 h-[2px]"></div>
              <div class="text-abru-light-75 grid min-h-[120px] grid-cols-3 gap-x-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10">
                <a id={letter} class="text-[64px] leading-none font-bold" safe>
                  {letter}
                </a>

                <div class="player-group col-span-1 grid grid-cols-9 content-start md:col-span-3 lg:col-span-5 xl:col-span-9">
                  {groupedPlayers.get(letter)?.map(player => (
                    <a
                      href={`/players/${player.steamId}`}
                      class="truncate whitespace-nowrap hover:underline"
                      safe
                    >
                      {player.name}
                    </a>
                  ))}
                </div>
              </div>
            </>
          ))}
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}

function groupPlayers(
  players: Pick<PlayerModel, 'steamId' | 'name'>[],
): Map<string, Pick<PlayerModel, 'steamId' | 'name'>[]> {
  return players.reduce((result, player) => {
    const first = player.name
      .replace(
        /[\s\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/gu,
        '',
      )
      .charAt(0)

    let key: string
    if (/\p{Script=Cyrillic}/u.test(first)) {
      key = first.toLocaleUpperCase('ru')
      if (key === 'Ё') key = 'Е'
    } else {
      key = deburr(first).toLocaleUpperCase()
      if (!/[a-zA-Z]/.test(key)) {
        key = '#'
      }
    }

    if (!result.has(key)) {
      result.set(key, [])
    }
    result.get(key)!.push(player)

    return result
  }, new Map<string, Pick<PlayerModel, 'steamId' | 'name'>[]>())
}
