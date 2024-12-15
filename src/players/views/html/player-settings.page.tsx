import { Layout } from '../../../html/layout'
import type { User } from '../../../auth/types/user'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { IconVolume } from '../../../html/components/icons'

export async function PlayerSettingsPage(props: { user: User }) {
  const soundVolume = props.user.player.preferences.soundVolume ?? 1

  return (
    <Layout title="Settings">
      <NavigationBar user={props.user} currentPage="/settings" />
      <Page>
        <div class="container mx-auto">
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
                <button type="submit" class="button button--accent mt-6">
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      </Page>
    </Layout>
  )
}
