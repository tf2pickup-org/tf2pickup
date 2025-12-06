import { resolve } from 'node:path'
import { PlayerRole, type PlayerBan, type PlayerModel } from '../../../database/models/player.model'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import type { User } from '../../../auth/types/user'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'
import {
  AdminPanel,
  AdminPanelBody,
  AdminPanelHeader,
  AdminPanelLink,
  AdminPanelSection,
  AdminPanelSidebar,
} from '../../../html/components/admin-panel'
import {
  IconAirTrafficControl,
  IconArrowBackUp,
  IconBan,
  IconDeviceFloppy,
  IconPlus,
  IconUserScan,
  IconX,
} from '../../../html/components/icons'
import type { Children } from '@kitajs/html'
import {
  format,
  formatDuration,
  hoursToMilliseconds,
  milliseconds,
  millisecondsToHours,
  millisecondsToMinutes,
  minutesToMilliseconds,
} from 'date-fns'
import { isBot } from '../../../shared/types/bot'
import { makeTitle } from '../../../html/make-title'
import { environment } from '../../../environment'
import { configuration } from '../../../configuration'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { players } from '../..'

const editPlayerPages = {
  '/profile': 'Profile',
  '/bans': 'Bans',
  '/roles': 'Roles',
} as const

export async function EditPlayerProfilePage(props: { steamId: SteamId64; user: User }) {
  const player = await players.bySteamId(props.steamId, [
    'name',
    'steamId',
    'avatar.large',
    'cooldownLevel',
  ])
  return (
    <EditPlayer player={player} user={props.user} activePage="/profile">
      <form action="" method="post">
        <div class="admin-panel-set">
          <div class="grid grid-cols-[1fr_184px] gap-y-4">
            <div class="input-group">
              <label class="label" for="player-nickname">
                Nickname
              </label>
              <input type="text" name="name" value={player.name} id="player-nickname" />
            </div>

            <div class="row-span-3">
              <img
                src={player.avatar.large}
                width="184"
                height="184"
                class="player-avatar rounded"
                alt={`${player.name}'s avatar`}
              />
            </div>

            <div class="input-group">
              <label class="label" for="cooldown-level">
                Cooldown level
              </label>
              <input
                type="number"
                name="cooldownLevel"
                value={player.cooldownLevel.toString()}
                id="cooldown-level"
                min="0"
              />
              <CooldownLevelsOverview />
            </div>

            <div class="self-end">
              <button type="submit" class="button button--accent button--dense">
                <IconDeviceFloppy size={20} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </EditPlayer>
  )
}

export async function EditPlayerBansPage(props: { steamId: SteamId64; user: User }) {
  const player = await players.bySteamId(props.steamId, ['bans', 'name', 'steamId'])
  const bans = player.bans?.toSorted((a, b) => b.start.getTime() - a.start.getTime())
  return (
    <EditPlayer
      player={player}
      user={props.user}
      activePage="/bans"
      action={
        <a href={`/players/${player.steamId}/edit/bans/add`} class="button button--accent">
          <IconPlus />
          Add ban
        </a>
      }
    >
      <div class="admin-panel-content">
        {bans?.length ? (
          <>
            <div class="edit-player-ban-list">
              {bans.map(ban => (
                <BanDetails player={player} ban={ban} />
              ))}
            </div>
          </>
        ) : (
          <span class="italic text-abru-light-75">No bans</span>
        )}
      </div>
    </EditPlayer>
  )
}

export async function EditPlayerRolesPage(props: { steamId: SteamId64; user: User }) {
  const player = await players.bySteamId(props.steamId, ['roles', 'name', 'steamId'])
  const roles = player.roles
  const safeWebsiteName = environment.WEBSITE_NAME
  return (
    <EditPlayer player={player} user={props.user} activePage="/roles">
      <form action="" method="post">
        <div class="admin-panel-set">
          <div class="form-checkbox">
            <input
              type="checkbox"
              name="roles"
              value={PlayerRole.admin}
              id="playerRoleAdmin"
              checked={roles.includes(PlayerRole.admin)}
            />
            <label for="playerRoleAdmin">Admin</label>
            <p class="description">
              Admins are able to edit players' skill and their profiles as well as modify{' '}
              {safeWebsiteName} configuration options.
            </p>
          </div>

          <div class="form-checkbox">
            <input
              type="checkbox"
              name="roles"
              value={PlayerRole.superUser}
              id="playerRoleSuperUser"
              checked={roles.includes(PlayerRole.superUser)}
            />
            <label for="playerRoleSuperUser">Super-user</label>
            <p class="description">
              Super-users can edit player's roles and access player action logs.
            </p>
          </div>

          <button type="submit" class="button button--accent button--dense">
            <IconDeviceFloppy size={20} />
            <span>Save</span>
          </button>
        </div>
      </form>
    </EditPlayer>
  )
}

function EditPlayer(props: {
  player: Pick<PlayerModel, 'name' | 'steamId'>
  user: User
  children: Children
  activePage: keyof typeof editPlayerPages
  action?: Children
}) {
  const safeName = props.player.name
  return (
    <Layout
      user={props.user}
      title={makeTitle(`Edit ${props.player.name}`)}
      embedStyle={resolve(import.meta.dirname, 'edit-player.page.css')}
    >
      <NavigationBar user={props.user} />
      <Page>
        <AdminPanel>
          <AdminPanelSidebar>
            <AdminPanelSection>Edit player: {safeName}</AdminPanelSection>
            <AdminPanelLink href={`/players/${props.player.steamId}`}>
              <IconArrowBackUp />
              Back
            </AdminPanelLink>
            <AdminPanelLink
              href={`/players/${props.player.steamId}/edit/profile`}
              active={props.activePage === '/profile'}
            >
              <IconUserScan />
              Profile
            </AdminPanelLink>
            <AdminPanelLink
              href={`/players/${props.player.steamId}/edit/bans`}
              active={props.activePage === '/bans'}
            >
              <IconBan />
              Bans
            </AdminPanelLink>

            {props.user.player.roles.includes(PlayerRole.superUser) && (
              <>
                <AdminPanelSection>Super-user</AdminPanelSection>
                <AdminPanelLink
                  href={`/players/${props.player.steamId}/edit/roles`}
                  active={props.activePage === '/roles'}
                >
                  <IconAirTrafficControl />
                  Roles
                </AdminPanelLink>
              </>
            )}
          </AdminPanelSidebar>
          <AdminPanelBody>
            <div class="admin-panel-header">
              <AdminPanelHeader>{editPlayerPages[props.activePage]}</AdminPanelHeader>
              {props.action ?? <></>}
            </div>
            {props.children}
          </AdminPanelBody>
        </AdminPanel>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}

export async function BanDetails(props: {
  player: Pick<PlayerModel, 'name' | 'steamId'>
  ban: PlayerBan
}) {
  let actorDesc = <></>
  if (isBot(props.ban.actor)) {
    actorDesc = <>bot</>
  } else {
    const actor = await players.bySteamId(props.ban.actor, ['name', 'steamId'])
    actorDesc = (
      <a href={`/players/${actor.steamId}`} safe>
        {actor.name}
      </a>
    )
  }

  return (
    <div class="ban-item group" id={`player-ban-${props.ban.start.getTime().toString()}`}>
      <form class="contents">
        <div class="col-span-3">
          <span class="me-2 text-2xl font-bold" safe>
            {props.ban.reason}
          </span>
          <span class="text-sm">by {actorDesc}</span>
        </div>

        <div class="row-span-2 flex items-center">
          {props.ban.end > new Date() ? (
            <button
              class="button button--darker"
              hx-put={`/players/${props.player.steamId}/edit/bans/${props.ban.start.getTime().toString()}/revoke`}
              hx-trigger="click"
              hx-target={`#player-ban-${props.ban.start.getTime().toString()}`}
              hx-swap="outerHTML"
            >
              <IconX />
              <span class="sr-only">Revoke ban</span>
            </button>
          ) : (
            <></>
          )}
        </div>

        <span class="text-base">
          Starts: <strong safe>{format(props.ban.start, 'MMMM dd, yyyy, HH:mm')}</strong>
        </span>

        <span class="text-base">
          Ends: <strong safe>{format(props.ban.end, 'MMMM dd, yyyy, HH:mm')}</strong>
        </span>
      </form>
    </div>
  )
}

async function CooldownLevelsOverview() {
  const cooldownLevels = await configuration.get('games.cooldown_levels')
  return (
    <details>
      <summary>Cooldown levels</summary>
      <ul class="grid grid-cols-[auto_1fr] gap-x-1">
        {cooldownLevels.map(({ level, banLengthMs }) => {
          const years = Math.floor(banLengthMs / milliseconds({ years: 1 }))
          banLengthMs -= milliseconds({ years })
          const months = Math.floor(banLengthMs / milliseconds({ months: 1 }))
          banLengthMs -= milliseconds({ months })
          const weeks = Math.floor(banLengthMs / milliseconds({ weeks: 1 }))
          banLengthMs -= milliseconds({ weeks })
          const days = Math.floor(banLengthMs / milliseconds({ days: 1 }))
          banLengthMs -= milliseconds({ days })
          const hours = millisecondsToHours(banLengthMs)
          banLengthMs -= hoursToMilliseconds(hours)
          const minutes = millisecondsToMinutes(banLengthMs)
          banLengthMs -= minutesToMilliseconds(minutes)
          const seconds = millisecondsToHours(banLengthMs)

          const safeDuration = formatDuration({
            years,
            months,
            weeks,
            days,
            hours,
            minutes,
            seconds,
          })
          return (
            <li class="col-span-2 grid grid-cols-subgrid">
              <strong class="text-end">{level}:</strong> <p>{safeDuration}</p>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
