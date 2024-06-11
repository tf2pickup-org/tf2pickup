import { resolve } from 'node:path'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Style } from '../../../html/components/style'
import { Layout } from '../../../html/layout'
import type { PlayerModel } from '../../../database/models/player.model'
import { deburr } from 'lodash-es'
import { collections } from '../../../database/collections'

const alpha = Array.from(Array(26)).map((_e, i) => i + 65)
const groups = ['#', ...alpha.map(x => String.fromCharCode(x))]

export async function PlayerListPage() {
  const players = await collections.players.find().toArray()
  const groupedPlayers = groupPlayers(players)

  return (
    <Layout title="players" head={<Style fileName={resolve(import.meta.dirname, 'style.css')} />}>
      <NavigationBar />
      <div class="container mx-auto">
        <div class="text-abru-light-75 my-9 text-[48px] font-bold">Players</div>

        <div class="hidden flex-row justify-between text-2xl font-bold text-abru-light-75 md:flex">
          {groups.map(letter => (
            <a href={`#${letter}`} style="uppercase" safe>
              {letter}
            </a>
          ))}
        </div>

        {groups.map(letter => (
          <>
            <div class="my-4 h-[2px] bg-abru-light-15"></div>
            <div class="grid min-h-[120px] grid-cols-3 gap-x-2 text-abru-light-75 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10">
              <a id={letter} class="text-[64px] font-bold leading-none" safe>
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
    </Layout>
  )
}

function groupPlayers(players: PlayerModel[]): Map<string, PlayerModel[]> {
  return players.reduce((result, player) => {
    let key = player.name
      .replace(
        /[\s\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/gu,
        '',
      )
      .charAt(0)
      .toLocaleUpperCase()
    key = deburr(key)

    if (!/[a-zA-Z]/.test(key)) {
      key = '#'
    }

    if (!result.has(key)) {
      result.set(key, [])
    }
    result.get(key)!.push(player)

    return result
  }, new Map<string, PlayerModel[]>())
}
