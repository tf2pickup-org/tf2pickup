import { collections } from '../../../database/collections'

export async function Announcements() {
  const announcements = await collections.announcements
    .find({ enabled: true })
    .sort({ createdAt: -1 })
    .toArray()

  if (announcements.length === 0) {
    return <></>
  }

  return (
    <>
      {announcements.map(announcement => {
        return (
          <div class="banner banner--info">
            <div class="prose max-w-none">{announcement.body as 'safe'}</div>
          </div>
        )
      })}
    </>
  )
}
