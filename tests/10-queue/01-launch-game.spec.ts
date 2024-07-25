import { authUsers, expect } from '../fixtures/auth-users'
import { users } from '../data'
import { secondsToMilliseconds } from 'date-fns'
import SteamID from 'steamid'
import { waitABit } from '../utils/wait-a-bit'
import { Mutex } from 'async-mutex'
import { mergeTests } from '@playwright/test'
import { simulateGameServer } from '../fixtures/simulate-game-server'

let gameNo: number

const test = mergeTests(authUsers, simulateGameServer)

test('launch game', async ({ steamIds, pages, page, gameServer }) => {
  // no players are in the queue
  await expect(page.getByRole('heading', { name: /^Players:/ })).toHaveText('Players: 0/12')

  const queueUsers = steamIds.slice(0, 12)
  const mutex = new Mutex()
  await Promise.all(
    queueUsers.map(async (steamId, i) => {
      const page = pages.get(steamId)!

      await mutex.runExclusive(async () => {
        // join the queue
        await page.getByLabel(`Join queue on slot ${i}`, { exact: true }).click()
        expect(await page.title()).toMatch(/^\[\d+\/12\]/)
      })

      // last player joining the queue is ready by default
      if (i !== 11) {
        // wait for ready-up
        await page.getByRole('button', { name: `I'M READY` }).click()
      }

      await page.waitForURL(/games\/(\d+)/)
      const matches = page.url().match(/games\/(\d+)/)
      if (matches) {
        gameNo = Number(matches[1])
      }
      expect(gameNo).toBeTruthy()
    }),
  )

  await page.goto(`/games/${gameNo}`)

  await Promise.all(
    queueUsers.map(async steamId => {
      const page = pages.get(steamId)!
      const userName = users.find(u => u.steamId === steamId)!.name

      const playerLink = page.getByRole('link', { name: userName })
      await expect(playerLink).toBeVisible()
      expect(await playerLink.getAttribute('href')).toMatch(`/players/${steamId}`)

      await page.goto('/')
      const goBackLink = page.getByRole('link', { name: 'Go back to the game' })
      await expect(goBackLink).toBeVisible()
      await goBackLink.click()

      await page.waitForURL(/games\/(\d+)/)
      const gameState = page.getByLabel('Game status')
      await expect(gameState).toBeVisible()
      await expect(gameState).toContainText('live', { ignoreCase: true })

      const events = page.getByLabel('Game events')
      await expect(events.getByText('Game created')).toBeVisible()

      const connectString = page.getByLabel('Connect string')
      await expect(connectString).toBeVisible()
      await expect(connectString).toHaveText('configuring server...')
      await expect(events.getByText('Game server assigned')).toBeVisible()

      await expect(connectString).toHaveText(/^connect .+;\s?password (.+)$/, {
        timeout: secondsToMilliseconds(30),
      })

      const [, password] =
        (await connectString.innerText()).match(/^connect .+;\s?password (.+)$/) ?? []
      expect(gameServer.cvar('sv_password').value).toEqual(password)

      await expect(page.getByRole('link', { name: 'join game' })).toBeVisible()
      await expect(events.getByText('Game server initialized')).toBeVisible()

      await expect(
        page.getByLabel(`${userName}'s slot`).getByLabel('Player connection status'),
      ).toHaveClass(/offline/)
      expect(gameServer.commands.some(cmd => cmd.includes(`sm_game_player_add ${steamId}`))).toBe(
        true,
      )
    }),
  )

  await expect(page.getByLabel('Connect string')).toHaveText(
    /^connect ([a-z0-9\s.:]+)(;\s?password tv)?$/,
  ) // verify no password is leaking
  await expect(page.getByLabel('Game events').getByText('Game server initialized')).toBeVisible()
  await expect(page.getByRole('link', { name: 'watch stv' })).toBeVisible()

  await Promise.all(
    queueUsers.map(async steamId => {
      const page = pages.get(steamId)!
      const userName = users.find(u => u.steamId === steamId)!.name

      const slot = page.getByLabel(`${userName}'s slot`)
      await expect(slot).toBeVisible()

      await expect(slot.getByRole('link', { name: userName })).toBeVisible()

      const steamId3 = new SteamID(steamId).steam3()
      gameServer.log(`"${userName}< ><21><${steamId3}><>" connected, address "127.0.0.1:27005"`)
      await expect(slot.getByLabel('Player connection status')).toHaveClass(/joining/)

      gameServer.log(`"${userName}<21><${steamId3}><Unassigned>" joined team "Red"`)
      await expect(slot.getByLabel('Player connection status')).toHaveClass(/connected/)
    }),
  )

  gameServer.log('World triggered "Round_Start"')
  await expect(page.getByLabel('Game events').getByText('Game started')).toBeVisible()
  await waitABit(secondsToMilliseconds(10))
  gameServer.log('World triggered "Game_Over" reason "Reached Win Limit"')
  gameServer.log('Team "Red" final score "5" with "6" players')
  gameServer.log('Team "Blue" final score "0" with "6" players')
  await expect(page.getByLabel('Game events').getByText('Game ended')).toBeVisible()

  await Promise.all(
    queueUsers.map(async steamId => {
      const page = pages.get(steamId)!
      const gameState = page.getByLabel('Game status')
      await expect(gameState).not.toContainText('live', { ignoreCase: true })
    }),
  )
})

export { expect } from '@playwright/test'
