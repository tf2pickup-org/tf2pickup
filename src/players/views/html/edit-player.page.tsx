import { resolve } from 'node:path'
import type { PlayerModel } from '../../../database/models/player.model'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import type { User } from '../../../auth/types/user'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'
import {
  AdminPanel,
  AdminPanelBody,
  AdminPanelLink,
  AdminPanelSidebar,
} from '../../../html/components/admin-panel'
import {
  IconBan,
  IconChartArrowsVertical,
  IconPlus,
  IconUserScan,
  IconX,
} from '../../../html/components/icons'
import type { Children } from '@kitajs/html'
import { queue } from '../../../queue'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { configuration } from '../../../configuration'
import { collections } from '../../../database/collections'
import type { WithId } from 'mongodb'
import type { PlayerBanModel } from '../../../database/models/player-ban.model'
import { format } from 'date-fns'
import { html } from '../../../html'

const editPlayerPages = {
  '/profile': 'Profile',
  '/skill': 'Skill',
  '/bans': 'Bans',
} as const

const style = await html.embed(resolve(import.meta.dirname, 'style.css'))

export async function EditPlayerProfilePage(props: { player: PlayerModel; user: User }) {
  return (
    <EditPlayer player={props.player} user={props.user} activePage="/profile">
      <form action="" method="post">
        <div class="admin-panel-content">
          <div class="group">
            <div class="input-group">
              <label class="label" for="player-nickname">
                Nickname
              </label>
              <input type="text" name="name" value={props.player.name} id="player-nickname" />
            </div>
          </div>
        </div>

        <button type="submit" class="button button--accent mt-6">
          Save
        </button>
      </form>
    </EditPlayer>
  )
}

export async function EditPlayerSkillPage(props: { player: PlayerModel; user: User }) {
  const config = queue.config
  const defaultSkill = await configuration.get('games.default_player_skill')
  return (
    <EditPlayer player={props.player} user={props.user} activePage="/skill">
      <form action="" method="post">
        <div class="admin-panel-content">
          <div class="group">
            <div class="input-group">
              <label class="label" for="player-skill">
                Skill
              </label>
              <div class="flex flex-row gap-6">
                {config.classes.map(gameClass => {
                  const skill =
                    props.player.skill?.[gameClass.name] ?? defaultSkill[gameClass.name] ?? 0
                  return (
                    <div class="flex flex-row items-center gap-2">
                      <GameClassIcon gameClass={gameClass.name} size={32} />
                      <input
                        type="number"
                        name={`skill.${gameClass.name}`}
                        value={skill.toString()}
                        class="player-skill"
                        required
                        step="0.1"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <button type="submit" class="button button--accent mt-6">
          Save
        </button>
      </form>
    </EditPlayer>
  )
}

export async function EditPlayerBansPage(props: { player: WithId<PlayerModel>; user: User }) {
  const bans = await collections.playerBans
    .find({ player: props.player._id })
    .sort({ start: -1 })
    .toArray()

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
        {bans.length === 0 ? (
          <span class="italic text-abru-light-75">No bans</span>
        ) : (
          <>
            <div class="edit-player-ban-list">
              {bans.map(ban => (
                <BanDetails ban={ban} />
              ))}
            </div>
          </>
        )}
      </div>
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
  return (
    <Layout
      title={`Edit ${props.player.name}`}
      head={
        <style type="text/css" safe>
          {style}
        </style>
      }
    >
      <NavigationBar user={props.user} />
      <Page>
        <AdminPanel>
          <AdminPanelSidebar>
            <AdminPanelLink
              href={`/players/${props.player.steamId}/edit/profile`}
              active={props.activePage === '/profile'}
            >
              <IconUserScan />
              Profile
            </AdminPanelLink>
            <AdminPanelLink
              href={`/players/${props.player.steamId}/edit/skill`}
              active={props.activePage === '/skill'}
            >
              <IconChartArrowsVertical />
              Skill
            </AdminPanelLink>
            <AdminPanelLink
              href={`/players/${props.player.steamId}/edit/bans`}
              active={props.activePage === '/bans'}
            >
              <IconBan />
              Bans
            </AdminPanelLink>
          </AdminPanelSidebar>
          <AdminPanelBody>
            <div class="admin-panel-header">
              <h1>{editPlayerPages[props.activePage]}</h1>
              {props.action ? props.action : <></>}
            </div>
            {props.children}
          </AdminPanelBody>
        </AdminPanel>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}

export async function BanDetails(props: { ban: WithId<PlayerBanModel> }) {
  const player = await collections.players.findOne({ _id: props.ban.player })
  if (!player) {
    throw new Error(`player ${props.ban.player.toString()} not found`)
  }
  const admin = await collections.players.findOne({ _id: props.ban.admin })

  return (
    <div class="ban-item group" id={`player-ban-${props.ban._id}`}>
      <form class="contents">
        <div class="col-span-3">
          <span class="me-2 text-2xl font-bold" safe>
            {props.ban.reason}
          </span>
          <span class="text-sm">
            by{' '}
            <a href={`/players/${admin?.steamId}`} safe>
              {admin?.name ?? 'unknown admin'}
            </a>
          </span>
        </div>

        <div class="row-span-2 flex items-center">
          {props.ban.end > new Date() ? (
            <button
              class="button button--darker"
              hx-put={`/players/${player.steamId}/edit/bans/${props.ban._id.toString()}/revoke`}
              hx-trigger="click"
              hx-target={`#player-ban-${props.ban._id}`}
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
