import { resolve } from 'node:path'
import { environment } from '../../../environment'
import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'
import { GameActivity } from './game-activity'
import { GameLaunchTimeSpans } from './game-launch-time-spans'
import { GlobalStats } from './global-stats'
import { PlayedMapsCount } from './played-maps-count'

export async function StatisticsPage() {
  return (
    <Layout
      title={makeTitle('statistics')}
      description={`${environment.WEBSITE_NAME} statistics`}
      canonical="/statistics"
      embedStyle={resolve(import.meta.dirname, 'statistics.css')}
    >
      <NavigationBar wide />
      <Page>
        <div class="page-wide">
          <h1 class="page-title">Stats</h1>

          <div class="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GlobalStats />

            <div class="page-panel flex flex-col">
              <PlayedMapsCount />
            </div>

            <div class="page-panel flex flex-col">
              <GameLaunchTimeSpans />
            </div>

            <div class="page-panel lg:col-span-2">
              <GameActivity />
            </div>
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}
