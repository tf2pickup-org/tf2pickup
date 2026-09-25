import { queues } from '../../../../queues'
import type { Gamemode } from '../../../../shared/types/gamemode'
import { gamemodeConfigs } from '../../../../gamemodes/configs'
import { IconDownload, IconUpload } from '../../../../html/components/icons'
import { Admin } from '../../../views/html/admin'

export async function SkillImportExportPage(props: { gamemode: Gamemode }) {
  const { gamemode } = props
  const classNames = gamemodeConfigs[gamemode].classes.map(c => c.name)
  const gamemodes = await queues.gamemodesInUse()

  return (
    <Admin activePage="skill-import-export">
      {gamemodes.length > 1 && (
        <nav class="mb-4 flex flex-row flex-wrap gap-2" aria-label="Gamemodes">
          {gamemodes.map(tab => (
            <a
              href={`/admin/skill-import-export?gamemode=${tab}`}
              class={[
                'rounded-md px-3 py-1.5 text-sm font-bold',
                tab === gamemode
                  ? 'bg-accent text-white'
                  : 'bg-abru-light-10 text-abru-light-75 hover:text-white',
              ]}
              aria-current={tab === gamemode ? 'page' : undefined}
            >
              {tab}
            </a>
          ))}
        </nav>
      )}
      <div class="admin-panel-set flex flex-col gap-6">
        <section>
          <h2 class="mb-2 text-lg font-bold">Export player skills</h2>
          <p class="text-abru-light-75 mb-4 text-sm">
            Download a CSV file containing all players' {gamemode} skills. The file will include
            columns for steamId, name, and skill values for: {classNames.join(', ') as 'safe'}.
          </p>
          <a
            href={`/admin/skill-import-export/export?gamemode=${gamemode}`}
            class="inline-flex items-center gap-2"
            hx-boost="false"
          >
            <IconDownload size={20} />
            Download CSV
          </a>
        </section>

        <hr class="border-abru-dark-29" />

        <section>
          <h2 class="mb-2 text-lg font-bold">Import player skills</h2>
          <p class="text-abru-light-75 mb-4 text-sm">
            Upload a modified CSV file to update players' {gamemode} skills. You'll see a preview of
            changes before applying them.
          </p>
          <form
            action={`/admin/skill-import-export/upload?gamemode=${gamemode}`}
            method="post"
            enctype="multipart/form-data"
            class="flex flex-col gap-4"
          >
            <div>
              <label for="csvFile" class="mb-1 block text-sm font-medium">
                Select CSV file
              </label>
              <input
                type="file"
                id="csvFile"
                name="file"
                accept=".csv,text/csv"
                required
                class="file:bg-abru-dark-29 hover:file:bg-abru-dark-35 block w-full text-sm file:mr-4 file:rounded file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </div>
            <div>
              <button type="submit" class="button inline-flex items-center gap-2" data-size="dense">
                <IconUpload size={20} />
                Upload and preview
              </button>
            </div>
          </form>
        </section>
      </div>
    </Admin>
  )
}
