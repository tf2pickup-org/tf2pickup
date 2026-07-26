import { collections } from '../../../database/collections'
import type { PlayerBan, PlayerModel } from '../../../database/models/player.model'
import { environment } from '../../../environment'
import { players } from '../../../players'
import { isBot } from '../../../shared/types/bot'
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

  const actor = await collections.players.findOne<Pick<PlayerModel, 'bans'>>(
    { steamId: props.actor },
    { projection: { bans: 1 } },
  )
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
        <div class="banner" data-tone="warning">
          You are banned until&nbsp;
          <span class="font-bold" safe>
            {ban.end.toLocaleString()}
          </span>
          &nbsp;for&nbsp;
          <span class="font-bold" safe>
            {ban.reason}
          </span>
          <BanAttribution ban={ban} />
        </div>
      ))}
    </>
  )
}

async function BanAttribution(props: { ban: PlayerBan }) {
  let actorName: string
  if (props.ban.anonymous) {
    actorName = `${environment.WEBSITE_NAME} Staff`
  } else if (isBot(props.ban.actor)) {
    return <></>
  } else {
    actorName = (await players.bySteamId(props.ban.actor, ['name'])).name
  }

  return (
    <>
      &nbsp;by&nbsp;
      <span class="font-bold" safe>
        {actorName}
      </span>
    </>
  )
}
