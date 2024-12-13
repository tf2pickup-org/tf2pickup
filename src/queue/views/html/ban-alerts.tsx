import { collections } from '../../../database/collections'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function BanAlerts(props: { actor?: SteamId64 | undefined }) {
  return (
    <div id="ban-alerts" class="contents">
      <BanAlertList actor={props.actor} />
    </div>
  )
}

export async function BanAlertList(props: { actor?: SteamId64 | undefined }) {
  if (!props.actor) {
    return <></>
  }

  const actor = await collections.players.findOne({ steamId: props.actor })
  if (!actor) {
    return <></>
  }

  const bans = actor.bans
    ?.filter(({ end }) => end.getTime() > new Date().getTime())
    .toSorted((a, b) => b.start.getTime() - a.start.getTime())
  if (!bans?.length) {
    return <></>
  }

  return (
    <>
      {bans.map(ban => (
        <div class="banner banner--warning">
          You are banned until&nbsp;<span class="font-bold">{ban.end.toLocaleString()}</span>
          &nbsp;for&nbsp;
          <span class="font-bold" safe>
            {ban.reason}
          </span>
        </div>
      ))}
    </>
  )
}
