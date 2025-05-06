import type { Children } from '@kitajs/html'
import type { User } from '../../../auth/types/user'
import {
  AdminPanel,
  AdminPanelBody,
  AdminPanelHeader,
  AdminPanelLink,
  AdminPanelSection,
  AdminPanelSidebar,
} from '../../../html/components/admin-panel'
import {
  IconAdjustments,
  IconArrowsShuffle,
  IconBrandDiscord,
  IconHeadset,
  IconLogs,
  IconMapPinCog,
  IconMoodNerd,
  IconSectionSign,
  IconServer,
  IconSpy,
  IconUserExclamation,
  IconUserPlus,
} from '../../../html/components/icons'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { Footer } from '../../../html/components/footer'
import { resolve } from 'path'
import { makeTitle } from '../../../html/make-title'
import { PlayerRole } from '../../../database/models/player.model'

const adminPages = {
  'player-restrictions': {
    title: 'Player restrictions',
    icon: IconUserExclamation,
    section: 'Configuration',
  },
  games: {
    title: 'Games',
    icon: IconAdjustments,
    section: 'Configuration',
  },
  'map-pool': {
    title: 'Map pool',
    icon: IconMapPinCog,
    section: 'Configuration',
  },
  'game-servers': {
    title: 'Game servers',
    icon: IconServer,
    section: 'Configuration',
  },
  'voice-server': {
    title: 'Voice server',
    icon: IconHeadset,
    section: 'Configuration',
  },
  discord: {
    title: 'Discord',
    icon: IconBrandDiscord,
    section: 'Configuration',
  },
  'view-for-nerds': {
    title: 'View for nerds',
    icon: IconMoodNerd,
    section: 'Configuration',
  },
  'scramble-maps': {
    title: 'Scramble maps',
    icon: IconArrowsShuffle,
    section: 'Actions',
  },
  'bypass-registration-restrictions': {
    title: 'Bypass restrictions',
    icon: IconUserPlus,
    section: 'Actions',
  },
  rules: {
    title: 'Rules',
    icon: IconSectionSign,
    section: 'Documents',
  },
  'privacy-policy': {
    title: 'Privacy policy',
    icon: IconSpy,
    section: 'Documents',
  },
} as const

const superUserPages = {
  'player-action-logs': {
    title: 'Player action logs',
    icon: IconLogs,
    section: 'Configuration',
  },
} as const

const sections = Array.from(new Set(Object.values(adminPages).map(({ section }) => section)))

export function Admin(props: {
  user: User
  activePage: keyof typeof adminPages | keyof typeof superUserPages
  children: Children
}) {
  const title =
    props.activePage in adminPages
      ? adminPages[props.activePage as keyof typeof adminPages].title
      : superUserPages[props.activePage as keyof typeof superUserPages].title
  return (
    <Layout
      user={props.user}
      title={makeTitle(title)}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar user={props.user} />
      <Page>
        <AdminPanel>
          <AdminPanelSidebar>
            {sections.map(section => (
              <>
                <AdminPanelSection>{section}</AdminPanelSection>
                {Object.entries(adminPages)
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  .filter(([_, value]) => value.section === section)
                  .map(([key, value]) => (
                    <AdminPanelLink href={`/admin/${key}`} active={props.activePage === key}>
                      {value.icon({})}
                      {value.title}
                    </AdminPanelLink>
                  ))}
              </>
            ))}
            {props.user.player.roles.includes(PlayerRole.superUser) && (
              <>
                <AdminPanelSection>Super-user</AdminPanelSection>
                {Object.entries(superUserPages).map(([key, value]) => (
                  <AdminPanelLink href={`/admin/${key}`} active={props.activePage === key}>
                    {value.icon({})}
                    {value.title}
                  </AdminPanelLink>
                ))}
              </>
            )}
          </AdminPanelSidebar>

          <AdminPanelBody>
            <AdminPanelHeader>{title}</AdminPanelHeader>
            {props.children}
          </AdminPanelBody>
        </AdminPanel>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}
