import Html from '@kitajs/html'
import { requestContext } from '@fastify/request-context'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { resolve } from 'node:path'
import type { PickDeep } from 'type-fest'
import { PlayerRole, type PlayerModel } from '../../../database/models/player.model'
import { environment } from '../../../environment'
import { Footer } from '../../../html/components/footer'
import {
  IconAlignBoxBottomRight,
  IconBrandSteam,
  IconBrandTwitch,
  IconStars,
} from '../../../html/components/icons'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'
import { playerAvatarUrl } from '../../../shared/player-avatar-url'
import { AdminToolbox } from './admin-toolbox'
import type { PlayerPageData } from './player.page'

const tabs = [
  { name: 'Game History', path: '' },
  { name: 'Stats', path: '/stats' },
] as const

export function PlayerProfileLayout(
  props: Html.PropsWithChildren<{
    player: PlayerPageData
    tab: (typeof tabs)[number]['name']
    safeToolbar?: JSX.Element
  }>,
) {
  const { player, safeToolbar } = props
  const user = requestContext.get('user')
  const baseUrl = `/players/${player.steamId}`
  const currentPath = tabs.find(({ name }) => name === props.tab)!.path

  return (
    <Layout
      title={makeTitle(currentPath ? `${player.name} · ${props.tab}` : player.name)}
      description={`${player.name} · ${player.stats.totalGames} games played on ${environment.WEBSITE_NAME} · member since ${format(player.joinedAt, 'MMMM yyyy')}`}
      image={`${baseUrl}/og-image.png`}
      canonical={`${baseUrl}${currentPath}`}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar wide />
      <Page>
        <div class="player-page">
          <ProfileCard player={player} />

          <div class="player-page-main">
            <div class="player-page-toolbar">
              <nav class="profile-tabs" aria-label="Profile">
                {tabs.map(({ name, path }) => (
                  <a
                    href={`${baseUrl}${path}`}
                    class="profile-tab"
                    aria-current={name === props.tab ? 'page' : undefined}
                    data-umami-event="open-profile-tab"
                    data-umami-event-tab={name}
                  >
                    {name}
                  </a>
                ))}
              </nav>
              {safeToolbar}
            </div>

            {props.children}
          </div>

          {user?.player.roles.includes(PlayerRole.admin) && <AdminToolbox player={player} />}
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}

function ProfileCard(props: {
  player: PickDeep<
    PlayerModel,
    | 'avatar.large'
    | 'name'
    | 'joinedAt'
    | 'etf2lProfile'
    | 'twitchTvProfile'
    | 'steamId'
    | 'stats.totalGames'
  >
}) {
  const { player } = props
  return (
    <div class="profile-card">
      <img
        src={playerAvatarUrl(player.avatar, 'large')}
        width="130"
        height="130"
        class="profile-avatar"
        alt={`${player.name}'s avatar`}
        fetchpriority="high"
      />

      <div class="profile-facts">
        <div>
          <span class="profile-fact-label">Joined</span>
          <span class="profile-fact-value" title={format(player.joinedAt, 'MMMM dd, yyyy')} safe>
            {formatDistanceToNowStrict(player.joinedAt, { addSuffix: true })}
          </span>
        </div>
        <div>
          <span class="profile-fact-label">Total games played:</span>
          <span class="profile-fact-value">{player.stats.totalGames}</span>
        </div>
      </div>

      <h1 class="profile-name" safe>
        {player.name}
      </h1>

      <div class="profile-links">
        {player.twitchTvProfile ? (
          <ProfileLink
            href={`https://www.twitch.tv/${player.twitchTvProfile.login}/`}
            target="twitch"
          >
            <IconBrandTwitch />
            <span>Twitch.tv</span>
          </ProfileLink>
        ) : (
          <></>
        )}
        {player.etf2lProfile ? (
          <ProfileLink
            href={`https://etf2l.org/forum/user/${player.etf2lProfile.id}`}
            target="etf2l"
          >
            <IconStars />
            <span>ETF2L</span>
          </ProfileLink>
        ) : (
          <></>
        )}
        <ProfileLink href={`https://steamcommunity.com/profiles/${player.steamId}`} target="steam">
          <IconBrandSteam />
          <span>Steam</span>
        </ProfileLink>
        <ProfileLink href={`https://logs.tf/profile/${player.steamId}`} target="logs">
          <IconAlignBoxBottomRight />
          <span>Logs.tf</span>
        </ProfileLink>
      </div>
    </div>
  )
}

function ProfileLink(props: Html.PropsWithChildren<{ href: string; target: string }>) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noreferrer"
      class="profile-link"
      data-umami-event="open-external-profile"
      data-umami-event-target={props.target}
    >
      {props.children}
    </a>
  )
}
