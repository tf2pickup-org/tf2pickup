import type { Children } from '@kitajs/html'
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
  IconAdjustmentsStar,
  IconAlertSquareRounded,
  IconBrandDiscord,
  IconDeviceGamepad,
  IconHeadset,
  IconHistory,
  IconLogs,
  IconMoodNerd,
  IconSectionSign,
  IconServer,
  IconSpy,
  IconBan,
  IconChartArrowsVertical,
  IconTrash,
  IconUserPlus,
} from '../../../html/components/icons'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { Footer } from '../../../html/components/footer'
import { resolve } from 'path'
import { makeTitle } from '../../../html/make-title'
import { PlayerRole } from '../../../database/models/player.model'
import { requestContext } from '@fastify/request-context'

const adminPages = {
  queues: { title: 'Queues', icon: IconDeviceGamepad, section: 'Queues' },
  registration: { title: 'Registration', icon: IconUserPlus, section: 'Players' },
  skill: { title: 'Skill', icon: IconChartArrowsVertical, section: 'Players' },
  penalties: { title: 'Penalties', icon: IconBan, section: 'Players' },
  games: { title: 'Games', icon: IconAdjustments, section: 'Games' },
  'game-servers': { title: 'Game servers', icon: IconServer, section: 'Games' },
  'voice-server': { title: 'Voice server', icon: IconHeadset, section: 'Games' },
  discord: { title: 'Discord', icon: IconBrandDiscord, section: 'Community' },
  announcements: { title: 'Announcements', icon: IconAlertSquareRounded, section: 'Community' },
  miscellaneous: { title: 'Miscellaneous', icon: IconAdjustmentsStar, section: 'Community' },
  rules: { title: 'Rules', icon: IconSectionSign, section: 'Community' },
  'privacy-policy': { title: 'Privacy policy', icon: IconSpy, section: 'Community' },
  'activity-log': { title: 'Activity log', icon: IconHistory, section: 'Logs' },
  'player-action-logs': {
    title: 'Player action logs',
    icon: IconLogs,
    section: 'Logs',
    superUserOnly: true,
  },
  'view-for-nerds': { title: 'View for nerds', icon: IconMoodNerd, section: 'Advanced' },
  'delete-player': {
    title: 'Delete player',
    icon: IconTrash,
    section: 'Advanced',
    superUserOnly: true,
  },
} as const

const sections = Array.from(new Set(Object.values(adminPages).map(({ section }) => section)))

export function Admin(props: { activePage: keyof typeof adminPages; children: Children }) {
  const user = requestContext.get('user')
  const isSuperUser = user?.player.roles.includes(PlayerRole.superUser) ?? false
  const visiblePages = Object.entries(adminPages).filter(
    ([, page]) => isSuperUser || !('superUserOnly' in page),
  )
  const title = adminPages[props.activePage].title
  return (
    <Layout title={makeTitle(title)} embedStyle={resolve(import.meta.dirname, 'style.css')}>
      <NavigationBar wide />
      <Page>
        <AdminPanel>
          <AdminPanelSidebar>
            {sections.map(section => (
              <>
                <AdminPanelSection>{section}</AdminPanelSection>
                {visiblePages
                  .filter(([, page]) => page.section === section)
                  .map(([key, page]) => (
                    <AdminPanelLink href={`/admin/${key}`} active={props.activePage === key}>
                      {page.icon({})}
                      {page.title}
                    </AdminPanelLink>
                  ))}
              </>
            ))}
          </AdminPanelSidebar>

          <AdminPanelBody>
            <AdminPanelHeader>{title}</AdminPanelHeader>
            {props.children}
          </AdminPanelBody>
        </AdminPanel>
      </Page>
      <Footer />
    </Layout>
  )
}
