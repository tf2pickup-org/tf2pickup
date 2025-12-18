import { collections } from '../../../../database/collections'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'
import { IconEdit, IconEye, IconEyeOff, IconMinus } from '../../../../html/components/icons'
import type { AnnouncementModel } from '../../../../database/models/announcement.model'
import type { WithId } from 'mongodb'

export async function AnnouncementsPage() {
  const announcements = await collections.announcements.find().sort({ createdAt: -1 }).toArray()

  return (
    <Admin activePage="announcements">
      <div class="flex flex-col gap-4">
        <div class="admin-panel-set">
          <h3 class="text-xl font-bold">Create New Announcement</h3>
          <form action="/admin/announcements" method="post" class="flex flex-col gap-2">
            <textarea
              name="body"
              placeholder="Enter announcement text (markdown supported)"
              class="min-h-[100px]"
              required
            ></textarea>
            <div class="flex items-center gap-2">
              <input type="checkbox" name="enabled" id="new-enabled" value="true" />
              <label for="new-enabled">Enable immediately</label>
            </div>
            <p>
              <SaveButton>Create Announcement</SaveButton>
            </p>
          </form>
        </div>

        <div class="admin-panel-set">
          <h3 class="text-xl font-bold">Existing Announcements</h3>
          {announcements.length === 0 ? (
            <p class="text-abru-light-50">No announcements yet.</p>
          ) : (
            <div id="announcement-list" class="flex flex-col gap-4">
              {announcements.map(announcement => (
                <AnnouncementEntry announcement={announcement} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Admin>
  )
}

export function AnnouncementEntry(props: { announcement: WithId<AnnouncementModel> }) {
  const { announcement } = props
  const id = announcement._id.toString()

  return (
    <div class="rounded-sm border border-abru-light-25 p-4">
      <div class="mb-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          {announcement.enabled ? (
            <span class="flex items-center gap-1 text-green-500">
              <IconEye /> Enabled
            </span>
          ) : (
            <span class="flex items-center gap-1 text-abru-light-50">
              <IconEyeOff /> Disabled
            </span>
          )}
          <span class="text-sm text-abru-light-50" safe>
            Created: {announcement.createdAt.toLocaleString()}
          </span>
        </div>
        <div class="flex gap-2">
          <button
            class="text-accent-500 flex items-center gap-1 hover:underline"
            hx-post={`/admin/announcements/${id}/toggle`}
            hx-target="closest div.rounded-sm"
            hx-swap="outerHTML"
          >
            {announcement.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            class="flex items-center gap-1 text-white hover:underline"
            hx-get={`/admin/announcements/${id}/edit`}
            hx-target="closest div.rounded-sm"
            hx-swap="outerHTML"
          >
            <IconEdit /> Edit
          </button>
          <button
            class="flex items-center gap-1 text-alert hover:underline"
            hx-delete={`/admin/announcements/${id}`}
            hx-confirm="Are you sure you want to delete this announcement?"
            hx-target="closest div.rounded-sm"
            hx-swap="outerHTML swap:1s"
          >
            <IconMinus /> Delete
          </button>
        </div>
      </div>
      <div class="whitespace-pre-wrap rounded-sm bg-abru-dark-15 p-2 text-sm">
        {announcement.body as 'safe'}
      </div>
    </div>
  )
}

export function AnnouncementEditForm(props: { announcement: WithId<AnnouncementModel> }) {
  const { announcement } = props
  const id = announcement._id.toString()

  return (
    <div class="rounded-sm border border-abru-light-25 p-4">
      <form
        action={`/admin/announcements/${id}`}
        method="post"
        class="flex flex-col gap-2"
        hx-post={`/admin/announcements/${id}`}
        hx-target="closest div.rounded-sm"
        hx-swap="outerHTML"
      >
        <textarea name="body" class="min-h-[100px]" required safe>
          {announcement.originalBody}
        </textarea>
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            name="enabled"
            id={`edit-enabled-${id}`}
            value="true"
            checked={announcement.enabled}
          />
          <label for={`edit-enabled-${id}`}>Enabled</label>
        </div>
        <div class="flex gap-2">
          <SaveButton>Save Changes</SaveButton>
          <button
            type="button"
            class="button"
            hx-get={`/admin/announcements/${id}/cancel`}
            hx-target="closest div.rounded-sm"
            hx-swap="outerHTML"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
