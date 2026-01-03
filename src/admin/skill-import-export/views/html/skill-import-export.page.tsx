import { Admin } from '../../../views/html/admin'
import { collections } from '../../../../database/collections'
import { IconFileImport, IconFileSpreadsheet } from '../../../../html/components/icons'
import { queue } from '../../../../queue'

export async function SkillImportExportPage() {
  const pendingCount = await collections.pendingSkills.countDocuments()
  const classNames = queue.config.classes.map(({ name }) => name).join(', ')

  return (
    <Admin activePage="skill-import-export">
      <div class="admin-panel-set flex flex-col gap-6">
        <section>
          <h2 class="text-abru-light-75 mb-2 text-xl font-bold">Export skills</h2>
          <p class="text-abru-light-50 mb-4">
            Download a CSV file containing all players' skills. The file can be edited and
            re-imported.
          </p>
          <a
            href="/admin/skill-import-export/export.csv"
            class="text-accent-500 flex items-center gap-1 hover:underline"
            hx-boost="false"
          >
            <IconFileSpreadsheet /> Download CSV
          </a>
        </section>

        <hr class="border-abru-light-5" />

        <section>
          <h2 class="text-abru-light-75 mb-2 text-xl font-bold">Import skills</h2>
          <p class="text-abru-light-50 mb-4">
            Upload a CSV file to import player skills. The file should have columns:{' '}
            <code class="text-abru-light-75">steamId</code> and class names ({classNames as 'safe'}
            ).
          </p>

          <form
            action="/admin/skill-import-export/import"
            method="post"
            enctype="multipart/form-data"
            class="flex flex-row items-end gap-4"
            hx-boost="false"
          >
            <div class="flex flex-col gap-1">
              <label class="text-abru-light-50 text-sm" for="csvFile">
                CSV file
              </label>
              <input
                type="file"
                name="file"
                id="csvFile"
                accept=".csv,text/csv"
                required
                class="text-abru-light-75"
              />
            </div>
            <button type="submit" class="button button--accent button--dense">
              <IconFileImport /> Import
            </button>
          </form>
        </section>

        {pendingCount > 0 && (
          <>
            <hr class="border-abru-light-5" />

            <section>
              <h2 class="text-abru-light-75 mb-2 text-xl font-bold">Pending skills</h2>
              <p class="text-abru-light-50">
                There are <strong class="text-abru-light-75">{pendingCount}</strong> skill(s)
                imported for players who haven't registered yet. These will be automatically applied
                when the players register.
              </p>
            </section>
          </>
        )}
      </div>
    </Admin>
  )
}
