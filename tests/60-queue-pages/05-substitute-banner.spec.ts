import { MongoClient } from 'mongodb'
import { test } from '@playwright/test'
import { defaultQueueSlug } from '../queue-slots'
import { expect } from '../fixtures/expect'

interface Box {
  x: number
  y: number
  width: number
  height: number
}

// At phone width the banner stacks its message above its button. When it kept them side by side,
// the paragraph squeezed to nothing and the unbreakable class name was painted behind the button.
test('the substitute banner names the class at phone width @6v6 @9v9', async ({ page }) => {
  const client = await MongoClient.connect(process.env['MONGODB_URI']!)
  const requests = client.db().collection('games.substituterequests')
  const gameNumber = 9001
  const inserted = await requests.insertOne({
    gameNumber,
    slotId: 'red-demoman-1',
    team: 'red',
    gameClass: 'demoman',
  })

  try {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(`/q/${defaultQueueSlug()}`)

    // requests from other tests may still be open, so only ever measure the one seeded here
    const banner = page
      .locator('#substitution-requests .banner')
      .filter({ hasText: new RegExp(`game\\s*#${gameNumber}`) })
    await expect(banner).toBeVisible()
    await expect(banner.getByText('Team RED needs a substitute for demoman')).toBeVisible()

    const boxes = await banner.evaluate(banner => {
      const box = (element: Element) => {
        const { x, y, width, height } = element.getBoundingClientRect()
        return { x, y, width, height }
      }
      return {
        banner: box(banner),
        paragraph: box(banner.querySelector('p')!),
        className: box(banner.querySelector('strong.whitespace-nowrap')!),
        button: box(banner.querySelector('a.button')!),
      }
    })

    const overlap = (a: Box, b: Box) =>
      Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0 &&
      Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0

    expect(overlap(boxes.className, boxes.button)).toBe(false)
    expect(boxes.className.x + boxes.className.width).toBeLessThanOrEqual(
      boxes.paragraph.x + boxes.paragraph.width,
    )
    expect(boxes.banner.x + boxes.banner.width).toBeGreaterThanOrEqual(
      boxes.className.x + boxes.className.width,
    )
  } finally {
    await requests.deleteOne({ _id: inserted.insertedId })
    await client.close()
  }
})
