import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'

export function PrivateSteamProfilePage() {
  return (
    <Layout title={makeTitle('Private Steam profile')}>
      <NavigationBar wide />
      <Page>
        <div class="page-wide flex h-full flex-col items-center justify-center gap-6 text-center">
          <h1 class="page-title mt-0!">Your Steam profile is private</h1>
          <p class="max-w-prose text-[#c7c4c7]">
            We were unable to verify your TF2 in-game hours because your Steam profile or game
            statistics are set to private. To register, please make your game details public.
          </p>
          <div class="page-actions justify-center">
            <a
              href="https://docs.tf2pickup.org/docs/player-registration-issues#private-steam-profile-and-game-statistics"
              class="button"
              data-variant="accent"
              target="_blank"
            >
              How to fix this
            </a>
            <a href="/" class="button">
              Go back home
            </a>
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}
