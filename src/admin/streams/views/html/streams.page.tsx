import { configuration } from '../../../../configuration'
import { environment } from '../../../../environment'
import { Admin } from '../../../views/html/admin'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'

export async function StreamsPage() {
  const promotedStreams = await configuration.get('twitchtv.promoted_streams')
  const twitchEnabled = Boolean(environment.TWITCH_CLIENT_ID && environment.TWITCH_CLIENT_SECRET)

  return (
    <Admin activePage="streams">
      <form action="/admin/streams" method="post" class="flex flex-col gap-4" data-save-bar>
        <SettingCard
          title="twitch.tv"
          description={
            twitchEnabled
              ? 'Live streams of players who linked their twitch.tv account are listed on the queue page, together with the channels below.'
              : 'Not configured. Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in the environment to list live streams.'
          }
        >
          <SettingRow
            label="Promoted channels"
            for="promotedStreams"
            configKey="twitchtv.promoted_streams"
            description="twitch.tv channel names that are always listed when they are live, whether or not they belong to a player. One per line."
          >
            <textarea id="promotedStreams" name="promotedStreams" rows="10" safe>
              {promotedStreams.join('\n')}
            </textarea>
          </SettingRow>
        </SettingCard>
        <SaveBar />
      </form>
    </Admin>
  )
}
