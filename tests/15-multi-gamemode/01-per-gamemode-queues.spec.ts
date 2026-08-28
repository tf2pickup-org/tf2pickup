import { mergeTests } from '@playwright/test'
import { authUsers, expect } from '../fixtures/auth-users'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'
import { QueuePage } from '../pages/queue.page'

// These specs only run on the multi-gamemode leg of the CI matrix, where the app
// boots with ENABLED_GAMEMODES=6v6,9v9 — 6v6 (the default) at `/`, 9v9 at `/9v9`.
const test = mergeTests(authUsers, waitForEmptyQueue)

test('serves a queue page per enabled gamemode with a switcher @multi', async ({ page }) => {
  const sixes = new QueuePage(page, '6v6')
  await sixes.goto()

  await expect(sixes.header()).toContainText('0/12')
  await expect(sixes.gamemodeSwitcher()).toBeVisible()
  await expect(sixes.gamemodeTab('6v6')).toHaveAttribute('aria-selected', 'true')

  // the switcher navigates to the 9v9 queue
  await sixes.gamemodeTab('9v9').click()
  await expect(page).toHaveURL(/\/9v9$/)

  const highlander = new QueuePage(page, '9v9')
  await expect(highlander.header()).toContainText('0/18')
  await expect(highlander.gamemodeTab('9v9')).toHaveAttribute('aria-selected', 'true')
})

test('keeps queue occupancy independent across gamemodes @multi', async ({ users }) => {
  const p6 = await users.getNext().queuePage('6v6')
  const p9 = await users.getNext().queuePage('9v9')
  await p6.goto()
  await p9.goto()

  await p6.joinQueue('scout-1')
  await expect(p6.header()).toContainText('1/12')
  await expect(p9.header()).toContainText('0/18')

  await p9.joinQueue('scout-1')
  await expect(p9.header()).toContainText('1/18')
  // the 6v6 queue is unaffected by activity in the 9v9 queue — a live-updated
  // header, not a reload, so this asserts the broadcast stays in its gamemode room
  await expect(p6.header()).toContainText('1/12')

  await p6.leaveQueue()
  await p9.leaveQueue()
})

test('joining another gamemode leaves the previous queue @multi', async ({ users }) => {
  const user = users.getNext()

  const sixes = await user.queuePage('6v6')
  await sixes.goto()
  await sixes.joinQueue('scout-1')
  await expect(sixes.header()).toContainText('1/12')

  // the same browser moves to the 9v9 queue and joins there
  const highlander = await user.queuePage('9v9')
  await highlander.goto()
  await highlander.joinQueue('scout-1')
  await expect(highlander.header()).toContainText('1/18')

  // one queue at a time: the player's 6v6 slot was vacated on the 9v9 join
  await sixes.goto()
  await expect(sixes.header()).toContainText('0/12')
  expect(await sixes.slot('scout-1').isTaken()).toBe(false)

  await highlander.goto()
  await highlander.leaveQueue()
})
