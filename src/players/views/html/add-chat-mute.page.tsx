import { resolve } from 'node:path'
import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { format } from 'date-fns'
import { makeTitle } from '../../../html/make-title'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { players } from '../..'
import { getBanExpiryDate } from '../../get-ban-expiry-date'

export async function AddChatMutePage(props: { steamId: SteamId64 }) {
  const player = await players.bySteamId(props.steamId, ['name'])
  return (
    <Layout
      title={makeTitle(`Mute ${player.name}`)}
      embedStyle={resolve(
        import.meta.dirname,
        '..',
        '..',
        '..',
        'admin',
        'views',
        'html',
        'style.css',
      )}
    >
      <NavigationBar wide />
      <Page>
        <div class="page-wide max-w-[720px]!">
          <h1 class="page-title">
            Mute{' '}
            <a href={`/players/${props.steamId}`} class="hover:underline" safe>
              {player.name}
            </a>
          </h1>
          <form action="" method="post" id="addChatMuteForm" class="mt-8">
            <div class="admin-panel-set page-panel">
              <div class="form-checkbox">
                <input
                  type="radio"
                  name="lengthSelector"
                  id="lengthSelectorDuration"
                  value="duration"
                  checked
                />
                <label for="lengthSelectorDuration">Duration</label>
              </div>

              <fieldset
                class="mb-2 ml-[22px] flex flex-row gap-2"
                data-toggle-disabled-form="#addChatMuteForm"
                data-toggle-disabled-control="lengthSelector"
                data-toggle-disabled-value="duration"
              >
                <input type="number" name="duration" id="duration-value" value="1" />
                <select name="durationUnits">
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                  <option value="years">years</option>
                </select>
              </fieldset>

              <div class="form-checkbox">
                <input type="radio" name="lengthSelector" id="lengthSelectorEndDate" value="date" />
                <label for="lengthSelectorEndDate">End date</label>
              </div>

              <fieldset
                class="mb-2 ml-[22px]"
                disabled
                data-toggle-disabled-form="#addChatMuteForm"
                data-toggle-disabled-control="lengthSelector"
                data-toggle-disabled-value="date"
              >
                <input
                  type="datetime-local"
                  name="date"
                  id="muteEndDate"
                  value={format(new Date(), `yyyy-MM-dd'T'HH:mm`)}
                />
                <label for="muteEndDate" class="sr-only">
                  Mute end date
                </label>
              </fieldset>

              <div class="form-checkbox">
                <input
                  type="radio"
                  name="lengthSelector"
                  id="lengthSelectorForever"
                  value="forever"
                />
                <label for="lengthSelectorForever">Forever</label>
              </div>

              <p>
                Mute ends at{' '}
                <span
                  id="muteEndsAt"
                  hx-get="/players/ban-expiry"
                  hx-include="#addChatMuteForm"
                  hx-params="*"
                  hx-trigger="change from:#addChatMuteForm delay:1s"
                >
                  {
                    format(
                      getBanExpiryDate({
                        lengthSelector: 'duration',
                        duration: 1,
                        durationUnits: 'minutes',
                      }),
                      'dd.MM.yyyy HH:mm',
                    ) as 'safe'
                  }
                </span>
              </p>

              <div class="input-group my-4">
                <label class="form-label" for="muteReason">
                  Reason
                </label>
                <input type="text" name="reason" id="muteReason" required />
              </div>
            </div>

            <div class="page-actions mt-6">
              <button type="submit" class="button" data-variant="accent">
                Save
              </button>
              <a href={`/players/${props.steamId}`} class="button">
                Cancel
              </a>
            </div>
          </form>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}
