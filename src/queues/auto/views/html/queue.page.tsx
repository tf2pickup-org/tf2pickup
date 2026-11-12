import { playerCounts } from '../../../player-counts'
import { QueueContent } from './queue-content'
import { queues } from '../../../../queues'
import { Layout } from '../../../../html/layout'
import { NavigationBar } from '../../../../html/components/navigation-bar'
import { resolve } from 'path'
import type { QueueModel } from '../../../../database/models/queue.model'
import { Page } from '../../../../html/components/page'
import { environment } from '../../../../environment'
import { RunningGameSnackbar } from './running-game-snackbar'
import { OfflineAlert } from './offline-alert'
import { SoundBlockedAlert } from './sound-blocked-alert'
import { Footer } from '../../../../html/components/footer'
import { RequestNotificationPermissions } from './request-notification-permissions'
import { SubstitutionRequests } from './substitution-requests'
import { BanAlerts } from './ban-alerts'
import { AcceptRulesDialog } from './accept-rules-dialog'
import { Sidebar } from './sidebar'
import { requestContext } from '@fastify/request-context'
import { Announcements } from './announcements'

export async function QueuePage(props: {
  queue: QueueModel
  // served at `/`, whose URL is rewritten to the queue's own
  atRoot?: boolean
}) {
  const { queue } = props
  const { current, required } = await playerCounts(queue)
  const user = requestContext.get('user')
  const isDefault = (await queues.getDefault())._id.equals(queue._id)

  return (
    <Layout
      title={`[${current}/${required}] ${environment.WEBSITE_NAME}`}
      description={`${queue.name} competitive pick-up games for everyone`}
      canonical={isDefault ? '/' : queues.queuePageUrl(queue.slug)}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      {props.atRoot && (
        <script>{`history.replaceState(null, '', '${queues.queuePageUrl(queue.slug)}')`}</script>
      )}
      <NavigationBar queuePage />
      <Page>
        <div class="queue-page">
          <div class="queue-alerts">
            <OfflineAlert />
            {!!user && <RequestNotificationPermissions />}
            {!!user && <SoundBlockedAlert />}
            <BanAlerts actor={user?.player.steamId} />
            <SubstitutionRequests />
            <Announcements />
          </div>
          <div class="queue-page-layout">
            <Sidebar queue={queue._id} user={user} required={required} />
            <QueueContent queue={queue} />
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
