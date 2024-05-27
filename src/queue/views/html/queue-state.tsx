import { collections } from '../../../database/collections'

export async function QueueState() {
  const current = await collections.queueSlots.countDocuments({ player: { $ne: null } })
  const required = await collections.queueSlots.countDocuments()
  return (
    <div
      class="mx-4 flex-1 text-xl font-bold lg:text-center flex-row flex gap-2 justify-center items-center"
      id="queue-state"
    >
      <span>Players:</span>
      <span>
        {current}/{required}
      </span>
    </div>
  )
}
