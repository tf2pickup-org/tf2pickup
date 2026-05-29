import { captainMode, expect } from '../fixtures/captain-mode'
import { CaptainQueuePage } from '../pages/captain-queue.page'

const test = captainMode

test('player joins a class column @6v6', async ({ page, users }) => {
  const observer = new CaptainQueuePage(page)
  const playerCtx = users.getNext()
  const playerPage = new CaptainQueuePage(await playerCtx.page())

  await playerPage.goto()

  await playerPage.classColumn('scout').join()

  await expect(observer.playerCount()).toHaveText('1')
  await expect(observer.classColumn('scout').playerCard(playerCtx.playerName)).toBeVisible()

  await playerPage.classColumn('scout').leave()
  await expect(observer.playerCount()).toHaveText('0')
})

test('player joins multiple classes and removes one @6v6', async ({ users }) => {
  const playerCtx = users.getNext()
  const playerPage = new CaptainQueuePage(await playerCtx.page())
  await playerPage.goto()

  await playerPage.classColumn('scout').join()
  await playerPage.classColumn('soldier').join()

  // Player appears in both columns
  await expect(playerPage.classColumn('scout').playerCard(playerCtx.playerName)).toBeVisible()
  await expect(playerPage.classColumn('soldier').playerCard(playerCtx.playerName)).toBeVisible()
  // Count is still 1 (same player in 2 classes)
  await expect(playerPage.playerCount()).toHaveText('1')

  // Remove just the scout class — button text changes to "Remove scout"
  await playerPage.classColumn('scout').removeOfferedClass()
  await expect(playerPage.classColumn('scout').playerCard(playerCtx.playerName)).not.toBeVisible()
  await expect(playerPage.classColumn('soldier').playerCard(playerCtx.playerName)).toBeVisible()

  // Now leave the last class
  await playerPage.classColumn('soldier').leave()
  await expect(playerPage.playerCount()).toHaveText('0')
})

test('join button is hidden for players already in that class @6v6', async ({ users }) => {
  const playerCtx = users.getNext()
  const playerPage = new CaptainQueuePage(await playerCtx.page())
  await playerPage.goto()

  await expect(playerPage.classColumn('scout').joinButton()).toBeVisible()
  await playerPage.classColumn('scout').join()
  await expect(playerPage.classColumn('scout').joinButton()).not.toBeVisible()

  await playerPage.classColumn('scout').leave()
  await expect(playerPage.classColumn('scout').joinButton()).toBeVisible()
})
