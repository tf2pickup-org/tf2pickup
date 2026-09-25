import type { QueueModel } from '../../../../database/models/queue.model'
import { environment } from '../../../../environment'
import { playerCounts } from '../../../player-counts'
import { QueueContent } from './queue-content'
import { RequiredPlayerCount } from './required-player-count'

// What a queue tab swaps in: the queue's content, its title and the sidebar's slot count.
export async function QueueContentSwap(props: { queue: QueueModel }) {
  const { current, required } = await playerCounts(props.queue)
  return (
    <>
      <QueueContent queue={props.queue} />
      <title safe>{`[${current}/${required}] ${environment.WEBSITE_NAME}`}</title>
      <RequiredPlayerCount required={required} oob />
    </>
  )
}
