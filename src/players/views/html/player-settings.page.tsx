import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { IconVolume } from '../../../html/components/icons'
import { makeTitle } from '../../../html/make-title'
import { TwitchTvSettingsEntry } from '../../../twitch-tv/views/html/twitch-tv-settings-entry'
import { Footer } from '../../../html/components/footer'
import { requestContext } from '@fastify/request-context'

export async function PlayerSettingsPage() {
  const user = requestContext.get('user')!
  const soundVolume = user.player.preferences.soundVolume ?? 1

  return (
    <Layout title={makeTitle('Settings')}>
      <NavigationBar wide />
      <Page>
        <div class="page-wide">
          <h1 class="page-title">Settings</h1>

          <form action="" method="post" class="page-panel mt-12 flex flex-col gap-3">
            <h2 class="text-2xl leading-[1.5] font-bold">Preferences</h2>

            <div class="flex flex-col gap-3">
              <label for="notification-sound-volume">Notification sound volume:</label>
              <div class="flex flex-row items-center gap-2">
                <IconVolume />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={soundVolume.toString()}
                  id="notification-sound-volume"
                  name="soundVolume"
                  class="accent-crimson-600 w-[357px] max-w-full"
                ></input>
              </div>
            </div>

            <div class="page-actions mt-3">
              <button
                type="submit"
                class="button"
                data-variant="accent"
                data-umami-event="save-settings"
              >
                Save
              </button>
            </div>
          </form>

          <div class="page-panel mt-6 flex flex-col gap-6">
            <h2 class="text-2xl leading-[1.5] font-bold">Integrations</h2>

            <TwitchTvSettingsEntry player={user.player} />
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}
