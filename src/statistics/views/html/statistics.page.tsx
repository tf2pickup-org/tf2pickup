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
      <NavigationBar />
      <Page>
        <div class="container mx-auto grid grid-cols-1 gap-4 px-2 lg:grid-cols-2">
          <div class="lg:col-span-2">
            <div class="text-abru-light-75 my-9 text-[48px] font-bold capitalize">Statistics</div>
          </div>

          <GlobalStats />

          <div class="bg-abru-dark-25 flex flex-col rounded-lg px-12 py-8">
            <PlayedMapsCount />
          </div>

          <div class="bg-abru-dark-25 flex flex-col rounded-lg px-6 py-8">
            <GameLaunchTimeSpans />
          </div>

          <div class="bg-abru-dark-25 rounded-lg px-6 py-8 lg:col-span-2">
            <GameActivity />
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}
