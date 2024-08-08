import { Layout } from '../../../html/layout'
import type { User } from '../../../auth/types/user'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { IconVolume } from '../../../html/components/icons'
import { collections } from '../../../database/collections'

export async function PlayerSettingsPage(props: { user: User }) {
  const player = await collections.players.findOne({ steamId: props.user.player.steamId })
  const preferences = await collections.playerPreferences.findOne({ player: player!._id })
  const soundVolume = preferences?.preferences.soundVolume ?? '1.0'

  return (
    <Layout title="Settings">
      <NavigationBar user={props.user} />
      <Page>
        <div class="container mx-auto">
          <form action="" method="post">
            <div class="bg-abru-dark-25 rounded-lg flex-1 p-[24px] text-abru-light-75 font-normal flex flex-col gap-4">
              <h4 class="font-bold text-[24px]">Preferences</h4>

              <div class="flex flex-col">
                <label for="notification-sound-volume">Notification sound volume</label>
                <div class="flex flex-row items-center gap-2">
                  <IconVolume />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={soundVolume}
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
