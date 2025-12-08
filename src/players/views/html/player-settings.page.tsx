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
      <NavigationBar />
      <Page>
        <div class="container mx-auto flex flex-col gap-8">
          <form action="" method="post">
            <div class="flex flex-1 flex-col gap-4 rounded-lg bg-abru-dark-25 p-[24px] font-normal text-abru-light-75">
              <h4 class="text-[24px] font-bold">Preferences</h4>

              <div class="flex flex-col">
                <label for="notification-sound-volume">Notification sound volume</label>
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
                    class="w-[360px]"
                  ></input>
                </div>
              </div>

              <div class="flex">
                <button
                  type="submit"
                  class="button button--accent mt-6"
                  data-umami-event="save-settings"
                >
                  Save
                </button>
              </div>
            </div>
          </form>

          <div class="flex flex-1 flex-col gap-4 rounded-lg bg-abru-dark-25 p-[24px] font-normal text-abru-light-75">
            <h4 class="text-[24px] font-bold">Linked accounts</h4>

            <TwitchTvSettingsEntry player={user.player} />
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}
