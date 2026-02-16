import { config } from '../../../../queue/config'
import { IconDownload, IconUpload } from '../../../../html/components/icons'
import { Admin } from '../../../views/html/admin'

export async function SkillImportExportPage() {
  const classNames = config.classes.map(c => c.name)

  return (
    <Admin activePage="skill-import-export">
      <div class="admin-panel-set flex flex-col gap-6">
        <section>
          <h2 class="mb-2 text-lg font-bold">Export player skills</h2>
          <p class="text-abru-light-75 mb-4 text-sm">
            Download a CSV file containing all players' skills. The file will include columns for
            steamId, name, and skill values for: {classNames.join(', ') as 'safe'}.
          </p>
          <a
            href="/admin/skill-import-export/export"
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
            Upload a modified CSV file to update player skills. You'll see a preview of changes
            before applying them.
          </p>
          <form
            action="/admin/skill-import-export/upload"
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
              <button type="submit" class="button button--dense inline-flex items-center gap-2">
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
