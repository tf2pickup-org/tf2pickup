import type { GameModel } from '../../../database/models/game.model'
import { games } from '../../../games'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { players } from '../../../players'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function SubstitutionRequests() {
  const requests = await games.getSubstitutionRequests()
  return (
    <div id="substitution-requests" class="contents">
      {requests.map(request => (
        <div class="banner banner--alert flex flex-row items-center">
          <p class="flex-1">
            Team <strong safe>{request.slot.team.toUpperCase()}</strong> needs a substitute for{' '}
            <strong class="whitespace-nowrap">
              <GameClassIcon gameClass={request.slot.gameClass} size={20} />{' '}
              {request.slot.gameClass}
            </strong>{' '}
            in game&nbsp;<span safe>#{request.gameNumber}</span>
          </p>
          <a
            class="button button--dense button--alert"
            href={`/games/${request.gameNumber}`}
            preload="mousedown"
          >
            View game details
          </a>
        </div>
      ))}
    </div>
  )
}

SubstitutionRequests.notify = async ({
  game,
  replacee,
  actor,
}: {
  game: GameModel
  replacee: SteamId64
  actor: SteamId64 | undefined
}) => {
  const slot = game.slots.find(s => s.player === replacee)
  if (!slot) {
    throw new Error('slot not found')
  }

  let volume = 1.0
  if (actor) {
    const player = await players.bySteamId(actor)
    volume = player.preferences.soundVolume ?? 1.0
  }

  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div
        notification-title="A substitute is needed!"
        notification-body={`Team ${slot.team} needs a substitute for ${slot.gameClass} in game #${game.number}`}
        notification-icon="/favicon.png"
        play-sound-src="/sounds/cmon_tough_guy.webm"
        play-sound-volume={volume}
      ></div>
    </div>
  )
}
