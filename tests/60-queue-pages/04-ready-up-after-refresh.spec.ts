import { mergeTests } from '@playwright/test'
import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGame } from '../fixtures/launch-game'
import { queues } from '../fixtures/queues'

const test = mergeTests(launchGame, queues).extend({
  queue: async ({ queues }, use) => {
    const { slug } = await queues.create({ template: 'auto-ultiduo', enable: true })
    await use({ slug, gamemode: 'ultiduo' })
  },
})

test('ready-up dialog is shown again after refreshing another queue @multi-queue', async ({
  players,
  desiredSlots,
  queue,
}) => {
  await Promise.all(
    players.map(async player => {
      const page = await player.queuePage(queue!.slug)
      await page.goto()
      await page.slot(desiredSlots.get(player.playerName)!).join()
    }),
  )

  const page = await players[0]!.queuePage(queue!.slug)
  await expect(page.readyUpDialog().readyUpButton()).toBeVisible({
    timeout: secondsToMilliseconds(15),
  })

  await page.page.reload()
  await expect(page.page).toHaveURL(`/q/${queue!.slug}`)
  await expect(page.readyUpDialog().readyUpButton()).toBeVisible({
    timeout: secondsToMilliseconds(10),
  })

  await Promise.all(
    players.map(async player => {
      await (await player.queuePage(queue!.slug)).readyUpDialog().notReady()
    }),
  )
})
