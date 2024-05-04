import { client } from '../../database'
import { Layout } from '../../views/layout'
import { navigationBar } from '../../views/navigation-bar'
import { style } from '../../views/style'
import { QueueSlotWithPlayer, queueWithPlayers } from '../pipelines/queue-with-players'
import { queueSlot } from './queue-slot'
import { resolve } from 'path'

export async function queue() {
  const slots = await client.db().collection('queue.slots').aggregate<QueueSlotWithPlayer>(queueWithPlayers).toArray()
  return (
    <>
      <Layout title={`[${current(slots)}/${required(slots)}]`} head={style(resolve(import.meta.dirname, 'queue.css'))}>
        {navigationBar()}
        <div class="flex flex-col gap-8">
          {slots.map(slot => queueSlot(slot))}
        </div>
      </Layout>
    </>
  )
}

function current(slots: QueueSlotWithPlayer[]): number {
  return slots.filter(slots => Boolean(slots.player)).length
}

function required(slots: QueueSlotWithPlayer[]): number {
  return slots.length
}