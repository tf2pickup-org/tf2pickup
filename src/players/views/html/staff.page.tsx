import { resolve } from 'node:path'
import { format } from 'date-fns'
import type { PickDeep } from 'type-fest'
import { collections } from '../../../database/collections'
import { PlayerRole, type PlayerModel } from '../../../database/models/player.model'
import { environment } from '../../../environment'
import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'
import { playerAvatarUrl } from '../../../shared/player-avatar-url'

type StaffMember = PickDeep<
  PlayerModel,
  'steamId' | 'name' | 'avatar' | 'roles' | 'joinedAt' | 'stats.totalGames'
>

export async function StaffPage() {
  const staff = await collections.players
    .find<StaffMember>(
      { roles: { $in: [PlayerRole.superUser, PlayerRole.admin] } },
      {
        projection: {
          _id: 0,
          steamId: 1,
          name: 1,
          avatar: 1,
          roles: 1,
          joinedAt: 1,
          'stats.totalGames': 1,
        },
      },
    )
    .toArray()
  staff.sort((a, b) => {
    const aSuperUser = a.roles.includes(PlayerRole.superUser)
    const bSuperUser = b.roles.includes(PlayerRole.superUser)
    if (aSuperUser !== bSuperUser) {
      return aSuperUser ? -1 : 1
    }
    return a.joinedAt.getTime() - b.joinedAt.getTime()
  })

  const onlineSteamIds = new Set(
    (
      await collections.onlinePlayers
        .find({ steamId: { $in: staff.map(({ steamId }) => steamId) } })
        .toArray()
    ).map(({ steamId }) => steamId),
  )

  return (
    <Layout
      title={makeTitle('staff')}
      description={`the people who keep ${environment.WEBSITE_NAME} running`}
      canonical="/staff"
      embedStyle={resolve(import.meta.dirname, 'staff.page.css')}
    >
      <NavigationBar />
      <Page>
        <div class="container mx-auto">
          <div class="my-9">
            <div class="text-abru-light-75 text-[48px] font-bold">Staff</div>
            <div class="text-abru-light-60 text-lg">
              The people who keep <span safe>{environment.WEBSITE_NAME}</span> running
            </div>
          </div>

          <div class="staff-list">
            {staff.map(member => (
              <StaffCard member={member} isOnline={onlineSteamIds.has(member.steamId)} />
            ))}
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}

function StaffCard(props: { member: StaffMember; isOnline: boolean }) {
  const { member } = props
  const isSuperUser = member.roles.includes(PlayerRole.superUser)
  return (
    <a
      class={['staff-card', isSuperUser ? 'staff-card--super-user' : 'staff-card--admin']}
      href={`/players/${member.steamId}`}
      preload="mousedown"
    >
      <div class="relative shrink-0 self-start">
        <img
          src={playerAvatarUrl(member.avatar, 'large')}
          width="184"
          height="184"
          class="staff-avatar"
          alt={`${member.name}'s avatar`}
        />
        {props.isOnline && <span class="online-dot" title="online now"></span>}
      </div>

      <div class="flex min-w-0 flex-col items-start gap-1">
        <span class="max-w-full truncate text-2xl font-bold" safe>
          {member.name}
        </span>
        {isSuperUser ? (
          <span class="bg-accent rounded-[3px] px-[8px] py-[6px] leading-none font-bold text-white">
            super user
          </span>
        ) : (
          <span class="bg-alert text-abru-light-3 rounded-[3px] px-[8px] py-[6px] leading-none font-bold">
            admin
          </span>
        )}
        <span class="mt-1 text-sm font-light" safe>
          since {format(member.joinedAt, 'MMMM yyyy')}
        </span>
        <span class="text-sm font-light">{member.stats.totalGames} games played</span>
      </div>
    </a>
  )
}
