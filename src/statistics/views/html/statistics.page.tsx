import type { User } from '../../../auth/types/user'
import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { PlayedMapsCount } from './played-maps-count'

export async function StatisticsPage(user?: User) {
  return (
    <Layout title="statistics">
      <NavigationBar user={user} currentPage="/statistics" />
      <Page>
        <div class="container mx-auto grid grid-cols-1 gap-4 px-2 lg:grid-cols-2">
          <div class="lg:col-span-2">
            <div class="my-9 text-[48px] font-bold capitalize text-abru-light-75">Statistics</div>
          </div>

          <div class="flex flex-col items-center rounded-lg bg-abru-dark-25 px-12 py-8 lg:row-span-2">
            <PlayedMapsCount />
          </div>
        </div>
      </Page>
      <Footer user={user} />
    </Layout>
  )
}
