import { games } from '../../../games'
import { GameClassIcon } from '../../../html/components/game-class-icon'

export async function SubstitutionRequests() {
  const requests = await games.getSubstitutionRequests()
  return (
    <div id="subsitution-requests" class="contents">
      {requests.map(request => (
        <div class="banner banner--alert flex flex-row items-center">
          <p class="flex-1">
            Team <strong safe>{request.slot.team.toUpperCase()}</strong> needs a substitute for{' '}
            <strong class="whitespace-nowrap">
              <GameClassIcon gameClass={request.slot.gameClass} size={20} />{' '}
              {request.slot.gameClass}
            </strong>{' '}
            in game #{request.gameNumber}
          </p>
          <a class="button button--dense button--alert" href={`/games/${request.gameNumber}`}>
            View game details
          </a>
        </div>
      ))}
    </div>
  )
}
