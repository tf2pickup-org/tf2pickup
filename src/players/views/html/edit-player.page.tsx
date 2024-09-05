import { resolve } from 'node:path'
import type { PlayerModel } from '../../../database/models/player.model'
import { Style } from '../../../html/components/style'
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
  AdminPanelSidebar,
} from '../../../html/components/admin-panel'
import {
  IconBan,
  IconChartArrowsVertical,
  IconPlus,
  IconUserScan,
} from '../../../html/components/icons'
import type { Children } from '@kitajs/html'
import { queue } from '../../../queue'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { configuration } from '../../../configuration'
import { collections } from '../../../database/collections'
import type { WithId } from 'mongodb'
import type { PlayerBanModel } from '../../../database/models/player-ban.model'
import { format } from 'date-fns'

const editPlayerPages = {
  '/profile': 'Profile',
  '/skill': 'Skill',
  '/bans': 'Bans',
} as const

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
    <EditPlayer player={props.player} user={props.user} activePage="/bans">
      <div class="admin-panel-content">
        {bans.length === 0 ? (
          <span class="text-abru-light-75 italic">No bans</span>
        ) : (
          bans.map(ban => <BanDetails ban={ban} />)
        )}
      </div>

      <div class="flex">
        <a
          href={`/players/${props.player.steamId}/edit/bans/add`}
          class="button button--accent mt-6"
        >
          <IconPlus />
          Add ban
        </a>
      </div>
    </EditPlayer>
  )
}

function EditPlayer(props: {
  player: PlayerModel
  user: User
  children: Children
  activePage: keyof typeof editPlayerPages
}) {
  return (
    <Layout
      title={`Edit ${props.player.name}`}
      head={<Style fileName={resolve(import.meta.dirname, 'style.css')} />}
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
            <AdminPanelHeader>{editPlayerPages[props.activePage]}</AdminPanelHeader>
            {props.children}
          </AdminPanelBody>
        </AdminPanel>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}

async function BanDetails(props: { ban: PlayerBanModel }) {
  const admin = await collections.players.findOne({ _id: props.ban.admin })
  if (!admin) {
    throw new Error(`admin with ID ${props.ban.admin.toString()} not found`)
  }
  return (
    <div class="group">
      <div>
        <span class="text-2xl font-bold me-2" safe>
          {props.ban.reason}
        </span>
        <span class="text-sm">
          by{' '}
          <a href={`/players/${admin.steamId}`} safe>
            {admin.name}
          </a>
        </span>
      </div>

      <div class="text-base" safe>
        Starts {format(props.ban.start, 'MMMM dd, yyyy, HH:mm')}
      </div>

      <div class="text-base" safe>
        Ends {format(props.ban.end, 'MMMM dd, yyyy, HH:mm')}
      </div>
    </div>
  )
}
