import type { Events } from '../../events'
import { games } from '../../games'
import { isVerificationEnabled } from '../is-verification-enabled'
import { isMumble } from './is-mumble'
import { voiceUrl } from './voice-url'

export async function replace({
  game,
  replacee,
  replacement,
  slotId,
}: Events['game:playerReplaced']) {
  if (!(await isMumble())) {
    return
  }

  const $set: Record<string, unknown> = {
    'slots.$[slot].voiceServerUrl': await voiceUrl(game, replacement),
  }
  if (replacee !== replacement && (await isVerificationEnabled())) {
    const slot = game.slots.find(({ id }) => id === slotId)
    // a replacee who takes the slot back is no longer outgoing
    $set['slots.$[slot].voiceOutgoing'] = [
      ...(slot?.voiceOutgoing ?? []).filter(
        player => player !== replacement && player !== replacee,
      ),
      replacee,
    ]
  }
  await games.update(game.number, { $set }, { arrayFilters: [{ 'slot.id': slotId }] })
}
