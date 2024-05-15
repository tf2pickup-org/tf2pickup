import { collections } from '../../database/collections'
import { Layout } from '../../views/layout'
import { NavigationBar } from '../../views/navigation-bar'
import { style } from '../../views/style'
import { QueueSlot } from './queue-slot'
import { resolve } from 'path'
import { QueueState } from './queue-state'
import { config } from '../config'
import { GameClassIcon } from '../../views/game-class-icon'
import { Page } from '../../views/page'
import { User } from '../../auth/types/user'

export async function Queue(user?: User) {
  const slots = await collections.queueSlots.find().toArray()

  const current = slots.filter(slots => Boolean(slots.player)).length
  const required = slots.length

  return (
    <Layout
      title={`[${current}/${required}]`}
      head={style(resolve(import.meta.dirname, 'queue.css'))}
    >
      <NavigationBar user={user} />
      <Page>
        <div class="order-2 lg:col-span-3">
          <div class="flex flex-col gap-8">
            <div class="bg-abru-light-70 relative flex h-[55px] flex-row items-center justify-center rounded-lg p-2 shadow-md sm:py-2">
              <QueueState />
            </div>

            <form class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" ws-send>
              {config.classes
                .map(gc => gc.name)
                .map(gameClass => (
                  <div class="flex flex-col gap-4">
                    <div class="flex flex-row items-center justify-center gap-2">
                      <GameClassIcon gameClass={gameClass} size={32} />
                      <span class="text-center text-2xl font-bold text-white">{gameClass}</span>
                    </div>

                    {slots
                      .filter(slot => slot.gameClass === gameClass)
                      .map(slot => (
                        <QueueSlot slot={slot} actor={user?.player.steamId} />
                      ))}
                  </div>
                ))}
            </form>
          </div>
        </div>
      </Page>
    </Layout>
  )
}
