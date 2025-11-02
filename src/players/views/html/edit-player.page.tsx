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
import { collections } from '../../../database/collections'
import { format } from 'date-fns'
import { isBot } from '../../../shared/types/bot'
import { makeTitle } from '../../../html/make-title'
import { environment } from '../../../environment'

const editPlayerPages = {
  '/profile': 'Profile',
  '/bans': 'Bans',
  '/roles': 'Roles',
} as const

export async function EditPlayerProfilePage(props: { player: PlayerModel; user: User }) {
  return (
    <EditPlayer player={props.player} user={props.user} activePage="/profile">
      <form action="" method="post">
        <div class="admin-panel-set">
          <div class="grid grid-cols-[1fr_184px] gap-y-4">
            <div class="input-group">
              <label class="label" for="player-nickname">
                Nickname
              </label>
              <input type="text" name="name" value={props.player.name} id="player-nickname" />
            </div>

            <div class="row-span-2">
              <img
                src={props.player.avatar.large}
                width="184"
                height="184"
                class="player-avatar rounded"
                alt={`${props.player.name}'s avatar`}
              />
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

export async function EditPlayerBansPage(props: { player: PlayerModel; user: User }) {
  const bans = props.player.bans?.toSorted((a, b) => b.start.getTime() - a.start.getTime())
  return (
    <EditPlayer
      player={props.player}
      user={props.user}
      activePage="/bans"
      action={
        <a href={`/players/${props.player.steamId}/edit/bans/add`} class="button button--accent">
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
                <BanDetails player={props.player} ban={ban} />
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

export async function EditPlayerRolesPage(props: { player: PlayerModel; user: User }) {
  const roles = props.player.roles
  return (
    <EditPlayer player={props.player} user={props.user} activePage="/roles">
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
            <p class="description" safe>
              Admins are able to edit players' skill and their profiles as well as modify{' '}
              {environment.WEBSITE_NAME} configuration options.
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
  player: PlayerModel
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

export async function BanDetails(props: { player: PlayerModel; ban: PlayerBan }) {
  let actorDesc = <></>
  if (isBot(props.ban.actor)) {
    actorDesc = <>bot</>
  } else {
    const actor = await collections.players.findOne({ steamId: props.ban.actor })
    if (actor === null) {
      throw new Error(`actor not found: ${props.ban.actor}`)
    }

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
