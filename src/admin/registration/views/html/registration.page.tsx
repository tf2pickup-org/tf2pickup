import { configuration } from '../../../../configuration'
import { IconPlus } from '../../../../html/components/icons'
import { Switch } from '../../../../html/components/switch'
import { Admin } from '../../../views/html/admin'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'
import { BypassedSteamIds } from './bypassed-steam-ids'

export async function RegistrationPage() {
  const [etf2lAccountRequired, minimumInGameHours, etf2lBanSync, etf2lBanSyncReasons] =
    await Promise.all([
      configuration.get('players.etf2l_account_required'),
      configuration.get('players.minimum_in_game_hours'),
      configuration.get('players.etf2l_ban_sync'),
      configuration.get('players.etf2l_ban_sync_reasons'),
    ])

  return (
    <Admin activePage="registration">
      <div class="flex flex-col gap-4">
        <form action="/admin/registration" method="post" class="flex flex-col gap-4" data-save-bar>
          <SettingCard title="Requirements">
            <SettingRow
              label="Require ETF2L account"
              for="etf2lAccountRequired"
              configKey="players.etf2l_account_required"
              description="Players without an ETF2L.org profile can't register."
            >
              <div class="flex justify-end">
                <Switch
                  id="etf2lAccountRequired"
                  name="etf2lAccountRequired"
                  checked={etf2lAccountRequired}
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Minimum TF2 in-game hours"
              for="minimumInGameHours"
              configKey="players.minimum_in_game_hours"
              description="Checked against the player's public Steam profile. Use 0 to turn the check off."
            >
              <input
                type="number"
                min="0"
                value={minimumInGameHours.toString()}
                id="minimumInGameHours"
                name="minimumInGameHours"
              />
            </SettingRow>
          </SettingCard>

          <SettingCard title="ETF2L ban sync">
            <SettingRow
              label="Sync ETF2L.org bans"
              for="etf2lBanSync"
              configKey="players.etf2l_ban_sync"
              description="Mirror matching ETF2L.org bans and prevent banned players from registering."
            >
              <div class="flex justify-end">
                <Switch id="etf2lBanSync" name="etf2lBanSync" checked={etf2lBanSync} />
              </div>
            </SettingRow>

            <SettingRow
              label="ETF2L.org ban reasons"
              for="etf2lBanSyncReasons"
              configKey="players.etf2l_ban_sync_reasons"
              description="Only bans whose reason contains one of these (case-insensitive) are mirrored. One reason per line; leave empty to mirror every ban."
            >
              <textarea id="etf2lBanSyncReasons" name="etf2lBanSyncReasons" rows="7" safe>
                {etf2lBanSyncReasons.join('\n')}
              </textarea>
            </SettingRow>
          </SettingCard>

          <SaveBar />
        </form>

        <SettingCard
          title="Exceptions"
          description="These players can register even if they don't meet the requirements above. An entry is removed once the player has registered."
        >
          <BypassedSteamIds />
          <form
            method="post"
            action="/admin/bypass-registration-restrictions"
            class="flex flex-row items-center gap-2 pb-4 max-lg:flex-wrap"
          >
            <label for="bypassSteamId" class="sr-only">
              Steam ID to allow
            </label>
            <input
              type="text"
              id="bypassSteamId"
              name="steamId"
              placeholder="SteamID64"
              class="max-lg:w-full max-lg:min-w-0"
            />
            <button
              type="submit"
              class="button whitespace-nowrap"
              data-variant="accent"
              data-size="dense"
            >
              <IconPlus size={20} />
              <span>Add user Steam ID</span>
            </button>
          </form>
        </SettingCard>
      </div>
    </Admin>
  )
}
