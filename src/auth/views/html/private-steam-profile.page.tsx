import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'

export function PrivateSteamProfilePage() {
  return (
    <Layout title={makeTitle('Private Steam profile')}>
      <NavigationBar />
      <Page>
        <div class="flex h-full flex-col items-center justify-center gap-6">
          <span class="text-abru-light-75 text-[36px] font-bold">
            Your Steam profile is private
          </span>
          <p class="text-abru-light-75 max-w-prose text-center">
            We were unable to verify your TF2 in-game hours because your Steam profile or game
            statistics are set to private. To register, please make your game details public.
          </p>
          <div class="flex flex-row gap-4">
            <a
              href="https://docs.tf2pickup.org/docs/player-registration-issues#private-steam-profile-and-game-statistics"
              class="button px-8"
              data-variant="accent"
              target="_blank"
            >
              How to fix this
            </a>
            <a href="/" class="button px-8">
              Go back home
            </a>
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}
