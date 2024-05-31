import { collections } from '../../../database/collections'

export async function QueueState() {
  const current = await collections.queueSlots.countDocuments({ player: { $ne: null } })
  const required = await collections.queueSlots.countDocuments()
  return (
    <div
      class="bg-abru-light-70 relative flex h-[55px] flex-row items-center justify-center rounded-lg p-2 shadow-md sm:py-2"
      id="queue-state"
    >
      <h3 class="mx-4 flex-1 text-xl font-bold lg:text-center">
        Players: {current}/{required}
      </h3>
    </div>
  )
}
