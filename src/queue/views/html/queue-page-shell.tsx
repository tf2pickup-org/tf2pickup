import type { Children } from '@kitajs/html'
import { requestContext } from '@fastify/request-context'
import { environment } from '../../../environment'
import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { AcceptRulesDialog } from '../../../queue-auto/views/html/accept-rules-dialog'
import { Announcements } from '../../../queue-auto/views/html/announcements'
import { BanAlerts } from '../../../queue-auto/views/html/ban-alerts'
import { OfflineAlert } from '../../../queue-auto/views/html/offline-alert'
import { RequestNotificationPermissions } from '../../../queue-auto/views/html/request-notification-permissions'
import { RunningGameSnackbar } from '../../../queue-auto/views/html/running-game-snackbar'
import { Sidebar } from '../../../queue-auto/views/html/sidebar'
import { SoundBlockedAlert } from '../../../queue-auto/views/html/sound-blocked-alert'
import { StreamList } from '../../../queue-auto/views/html/stream-list'
import { SubstitutionRequests } from '../../../queue-auto/views/html/substitution-requests'

/**
 * Everything both queue modes render identically. Each mode passes its already
 * resolved counts in and supplies its own queue body as children, so the shell
 * never has to know which collection the mode is backed by.
 */
export function QueuePageShell(props: {
  count: number
  required: number
  embedStyle: string
  children: Children
}) {
  const user = requestContext.get('user')

  return (
    <Layout
      title={`[${props.count}/${props.required}] ${environment.WEBSITE_NAME}`}
      description={`${environment.QUEUE_CONFIG} competitive pick-up games for everyone`}
      canonical="/"
      embedStyle={props.embedStyle}
    >
      <NavigationBar />
      <Page>
        <div class="container mx-auto grid grid-cols-1 gap-y-8 lg:grid-cols-4 lg:gap-x-4">
          <div class="order-1 grid grid-cols-1 gap-y-2 lg:col-span-4">
            <OfflineAlert />
            {!!user && <RequestNotificationPermissions />}
            {!!user && <SoundBlockedAlert />}
            <BanAlerts actor={user?.player.steamId} />
            <SubstitutionRequests />
            <Announcements />
          </div>

          <div class="order-2 lg:order-3 lg:row-span-2">
            <Sidebar user={user} count={props.count} required={props.required} />
          </div>

          <div id="queue-content" class="tab-content lg:contents!">
            {props.children}

            <div class="order-5 lg:col-span-4">
              <StreamList />
            </div>
          </div>
        </div>
      </Page>
      <Footer />

      <div id="queue-notify-container"></div>
      <RunningGameSnackbar gameNumber={user?.player.activeGame} />
      <AcceptRulesDialog actor={user} />
    </Layout>
  )
}
