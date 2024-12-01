import { collections } from '../../../database/collections'
import { SlotStatus } from '../../../database/models/game-slot.model'
import type { GameModel } from '../../../database/models/game.model'
import { IconHeadset } from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function JoinVoiceButton(props: { game: GameModel; actor: SteamId64 | undefined }) {
  return (
    <div class="contents" id={`game-${props.game.number}-join-voice-button`}>
      <JoinVoiceButtonContent {...props} />
    </div>
  )
}

async function JoinVoiceButtonContent(props: { game: GameModel; actor: SteamId64 | undefined }) {
  if (!props.actor) {
    return <></>
  }

  const slot = await getPlayerSlot(props.game, props.actor)
  if (!slot) {
    return <></>
  }

  if (!slot.voiceServerUrl) {
    return <></>
  }

  return (
    <a href={slot.voiceServerUrl} class="button">
      <IconHeadset size={24} />
      join voice
    </a>
  )
}

async function getPlayerSlot(game: GameModel, actor?: SteamId64) {
  if (!actor) {
    return undefined
  }

  const player = await collections.players.findOne({ steamId: actor })
  if (player === null) {
    throw new Error(`player ${actor} does not exist`)
  }

  return game.slots.find(
    slot =>
      slot.player.equals(player._id) &&
      [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(slot.status),
  )
}
