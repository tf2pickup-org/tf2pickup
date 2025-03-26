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

  const slot = getPlayerSlot(props.game, props.actor)
  if (!slot) {
    return <></>
  }

  if (!slot.voiceServerUrl) {
    return <></>
  }

  return (
    <a
      href={slot.voiceServerUrl}
      class="button"
      data-umami-event="join-voice"
      data-umami-event-game-number={props.game.number}
      data-umami-event-game-state={props.game.state}
    >
      <IconHeadset size={24} />
      join voice
    </a>
  )
}

function getPlayerSlot(game: GameModel, actor?: SteamId64) {
  if (!actor) {
    return undefined
  }

  return game.slots
    .filter(slot => [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(slot.status))
    .find(({ player }) => player === actor)
}
