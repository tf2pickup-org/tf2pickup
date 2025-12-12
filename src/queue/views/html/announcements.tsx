import { collections } from '../../../database/collections'
import { parse } from 'marked'

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
        const safeParsed = parse(announcement.body)
        return (
          <div class="banner banner--info">
            <div class="prose max-w-none">{safeParsed}</div>
          </div>
        )
      })}
    </>
  )
}

