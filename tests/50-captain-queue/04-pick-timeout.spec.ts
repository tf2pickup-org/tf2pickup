import { secondsToMilliseconds } from 'date-fns'
import { captainMode, expect } from '../fixtures/captain-mode'
import { CaptainQueuePage } from '../pages/captain-queue.page'
import type { UserName } from '../user-manager'
import type { Tf2ClassName } from '../pages/captain-queue.page'

const test = captainMode

// 6v6: 4 scouts, 4 soldiers, 2 demomen, 2 medics
const playerAssignments: [UserName, Tf2ClassName][] = [
  ['Promenader', 'scout'], // captain candidate
  ['Mayflower', 'scout'], // captain candidate
  ['Polemic', 'scout'],
  ['Shadowhunter', 'scout'],
  ['MoonMan', 'soldier'],
  ['Underfire', 'soldier'],
  ['Astropower', 'soldier'],
  ['LlamaDrama', 'soldier'],
  ['SlitherTuft', 'demoman'],
  ['Blacklight', 'demoman'],
  ['AstraGirl', 'medic'],
  ['BellBoy', 'medic'],
]

test('captain pick timeout reverts queue to waiting state @6v6', async ({ users }) => {
  test.setTimeout(secondsToMilliseconds(90))

  // Shorten pick timeout to the admin-enforced minimum so the test doesn't take long
  const admin = users.getAdmin()
  const adminPage = await admin.adminPage()
  await adminPage.setQueueMode('captain', { captainMinGames: 0, captainPickTimeout: 10 })

  // First two players opt in as captain candidates before the queue fills
  for (const [name, gameClass] of playerAssignments.slice(0, 2)) {
    const queuePage = new CaptainQueuePage(await users.byName(name).page())
    await queuePage.goto()
    await queuePage.classColumn(gameClass).join()
    await expect(queuePage.wantsCaptainLabel()).toContainText('I want to be captain', {
      timeout: 5000,
    })
    await queuePage.wantsCaptainToggle().check()
  }

  // Remaining 10 players join — fills the queue and triggers the ready-up phase
  await Promise.all(
    playerAssignments.slice(2).map(async ([name, gameClass]) => {
      const queuePage = new CaptainQueuePage(await users.byName(name).page())
      await queuePage.goto()
      await queuePage.classColumn(gameClass).join()
    }),
  )

  // All players ready up
  await Promise.all(
    playerAssignments.map(async ([name]) => {
      const queuePage = new CaptainQueuePage(await users.byName(name).page())
      await queuePage.readyUp()
    }),
  )

  // Observe from a non-captain player guaranteed to stay in the queue
  const observer = new CaptainQueuePage(await users.byName('Polemic').page())
  await observer.draftBoard().waitToBeVisible()

  // Don't pick — after 10 s the server kicks the BLU captain (BLU always picks first).
  // 6v6 needs 12 players; kicking 1 leaves 11, so canFormTeams returns false → waiting.
  await expect(observer.playerCount()).toHaveText('11', {
    timeout: secondsToMilliseconds(30),
  })

  // Draft board should be replaced with the empty placeholder
  await expect(observer.draftBoard().locator()).not.toHaveClass(/draft-board/, {
    timeout: secondsToMilliseconds(10),
  })

  // Captain queue form should be restored
  await expect(observer.page.locator('#captain-queue')).toBeVisible({
    timeout: secondsToMilliseconds(10),
  })
})
