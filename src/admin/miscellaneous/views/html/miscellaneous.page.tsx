import { configuration } from '../../../../configuration'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'

export async function MiscellaneousPage() {
  const discordInviteLink = await configuration.get('misc.discord_invite_link')

  return (
    <Admin activePage="miscellaneous">
      <form action="" method="post">
        <div class="admin-panel-set">
          <dl>
            <dt>
              <label for="discord-invite-link" class="font-medium">
                Discord invite link
              </label>
            </dt>
            <dd>
              <input
                type="url"
                id="discord-invite-link"
                name="discordInviteLink"
                value={discordInviteLink ?? ''}
                placeholder="https://discord.gg/..."
              />
            </dd>
          </dl>

          <p class="mt-8">
            <SaveButton />
          </p>
        </div>
      </form>
    </Admin>
  )
}
