import { resolve } from 'node:path'
import type { User } from '../../../auth/types/user'
import type { PlayerModel } from '../../../database/models/player.model'
import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Style } from '../../../html/components/style'
import { Layout } from '../../../html/layout'
import { format } from 'date-fns'

export async function AddBanPage(props: { player: PlayerModel; user: User }) {
  return (
    <Layout
      title={`Ban ${props.player.name}`}
      head={
        <Style
          fileName={resolve(
            import.meta.dirname,
            '..',
            '..',
            '..',
            'admin',
            'views',
            'html',
            'style.css',
          )}
        />
      }
    >
      <NavigationBar user={props.user} />
      <Page>
        <div class="container mx-auto">
          <form action="" method="post" id="addBanForm">
            <div class="admin-panel-set">
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
                class="ml-[22px] mb-2 flex flex-row gap-2"
                _={`
                on change from #addBanForm
                  if #addBanForm.lengthSelector.value is 'duration'
                    remove [@disabled]
                  else
                    add [@disabled]
                  end
              `}
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
                class="ml-[22px] mb-2"
                disabled
                _={`
                on change from #addBanForm
                  if #addBanForm.lengthSelector.value is 'date'
                    remove [@disabled]
                  else
                    add [@disabled]
                  end
              `}
              >
                <input
                  type="datetime-local"
                  name="date"
                  id="banEndDate"
                  value={format(new Date(), `yyyy-MM-dd'T'HH:mm`)}
                />
                <label for="banEndDate" class="sr-only">
                  Ban end date
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
                Ban ends at{' '}
                <span
                  id="banEndsAt"
                  hx-get="/players/ban-expiry"
                  hx-include="#addBanForm"
                  hx-params="*"
                  hx-trigger="change from:#addBanForm delay:1s"
                ></span>
              </p>

              <div class="my-4 input-group">
                <label class="label" for="banReason">
                  Reason
                </label>
                <input type="text" name="reason" id="banReason" required />
              </div>
            </div>

            <button type="submit" class="button button--accent mt-6">
              Save
            </button>
          </form>
        </div>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}
