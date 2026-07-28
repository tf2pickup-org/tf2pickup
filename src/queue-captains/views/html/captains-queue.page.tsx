import { requestContext } from '@fastify/request-context'
import { resolve } from 'node:path'
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
import { getCurrent } from '../../draft/get-current'
import { getReadiness } from '../../get-readiness'
import { ClassPicker } from './class-picker'
import { DraftBoard } from './draft-board'
import { PoolList } from './pool-list'
import { ReadinessMeter } from './readiness-meter'

export async function CaptainsQueuePage() {
  const user = requestContext.get('user')
  const [readiness, draft] = await Promise.all([getReadiness(), getCurrent()])

  return (
    <Layout
      title={`[${readiness.fillable}/${readiness.required}] ${environment.WEBSITE_NAME}`}
      description={`${environment.QUEUE_CONFIG} captain-drafted pick-up games`}
      canonical="/"
      embedStyle={resolve(import.meta.dirname, 'style.css')}
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
            <Sidebar user={user} />
          </div>

          <div id="queue-content" class="tab-content lg:contents!">
            <div class="order-3 lg:order-2 lg:col-span-3">
              <div class="flex flex-col gap-6">
                {draft ? (
                  <DraftBoard actor={user?.player.steamId} />
                ) : (
                  <>
                    <ReadinessMeter />
                    <ClassPicker actor={user?.player.steamId} />
                    <PoolList actor={user?.player.steamId} />
                  </>
                )}
              </div>
            </div>

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
