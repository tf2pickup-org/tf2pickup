import { captainMode, expect } from '../fixtures/captain-mode'
import { CaptainQueuePage } from '../pages/captain-queue.page'

const test = captainMode

test('wants-captain toggle is hidden when not in queue @6v6', async ({ users }) => {
  const playerPage = new CaptainQueuePage(await users.getNext().page())
  await playerPage.goto()

  // Toggle is rendered as an empty div when player is not in queue
  await expect(playerPage.wantsCaptainLabel()).not.toContainText('I want to be captain')
})

test('wants-captain toggle appears after joining the queue @6v6', async ({ users }) => {
  const playerCtx = users.getNext()
  const playerPage = new CaptainQueuePage(await playerCtx.page())
  await playerPage.goto()

  await playerPage.classColumn('scout').join()

  await expect(playerPage.wantsCaptainLabel()).toContainText('I want to be captain')

  await playerPage.classColumn('scout').leave()
})

test('crown icon is visible on player card when wants-captain is toggled @6v6', async ({
  page,
  users,
}) => {
  const observer = new CaptainQueuePage(page)
  const playerCtx = users.getNext()
  const playerPage = new CaptainQueuePage(await playerCtx.page())
  await playerPage.goto()

  await playerPage.classColumn('scout').join()

  // Crown icon not visible before toggling
  await expect(
    observer.classColumn('scout').playerCard(playerCtx.playerName).locator('.captain-wish-icon'),
  ).not.toBeVisible()

  // Toggle wants-captain
  await playerPage.wantsCaptainToggle().check()

  // Crown icon now visible on player card
  await expect(
    observer.classColumn('scout').playerCard(playerCtx.playerName).locator('.captain-wish-icon'),
  ).toBeVisible()

  // Toggle off
  await playerPage.wantsCaptainToggle().uncheck()
  await expect(
    observer.classColumn('scout').playerCard(playerCtx.playerName).locator('.captain-wish-icon'),
  ).not.toBeVisible()

  await playerPage.classColumn('scout').leave()
})
