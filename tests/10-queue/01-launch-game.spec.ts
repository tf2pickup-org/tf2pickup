import { authUsers, expect } from '../fixtures/auth-users'
import { users, type User } from '../data'
import { secondsToMilliseconds } from 'date-fns'
import { MongoClient } from 'mongodb'
import { GameServerSimulator } from '../game-server-simulator'
import SteamID from 'steamid'
import { waitABit } from '../utils/wait-a-bit'
import { Mutex } from 'async-mutex'

interface QueueUser extends User {
  slotId: number
}

const queueUsers: QueueUser[] = users.map((user, i) => ({ ...user, slotId: i }))

let gameNo: number

authUsers(...queueUsers.map(u => u.steamId))('launch game', async ({ pages, page }) => {
  // no players are in the queue
  await expect(page.getByRole('heading', { name: /^Players:/ })).toHaveText('Players: 0/12')

  const mutex = new Mutex()

  await Promise.all(
    queueUsers.map(async user => {
      const page = pages.get(user.steamId)!

      await mutex.runExclusive(async () => {
        // join the queue
        await page.getByLabel(`Join queue on slot ${user.slotId}`, { exact: true }).click()
        expect(await page.title()).toMatch(/^\[\d+\/12\]/)
      })

      // last player joining the queue is ready by default
      if (user.slotId !== 11) {
        // wait for ready-up
        await page.getByRole('button', { name: `I'M READY` }).click()
      }

      await page.waitForURL(/games\/(\d+)/)
      const matches = page.url().match(/games\/(\d+)/)
      if (matches) {
        gameNo = Number(matches[1])
      }
      expect(gameNo).toBeTruthy()

      const slot = page.getByRole('link', { name: user.name })
      await expect(slot).toBeVisible()
      expect(await slot.getAttribute('href')).toMatch(`/players/${user.steamId}`)

      await page.goto('/')
      const goBackLink = page.getByRole('link', { name: 'Go back to the game' })
      await expect(goBackLink).toBeVisible()
      await goBackLink.click()

      await page.waitForURL(/games\/(\d+)/)
      const gameState = page.getByLabel('Game status')
      await expect(gameState).toBeVisible()
      await expect(gameState).toContainText('live', { ignoreCase: true })

      const connectString = page.getByLabel('Connect string')
      await expect(connectString).toBeVisible()
      await expect(connectString).toHaveText('configuring server...')

      await expect(connectString).toHaveText(/^connect (.+);\s?password (.+)$/, {
        timeout: secondsToMilliseconds(30),
      })
      await expect(page.getByRole('link', { name: 'join game' })).toBeVisible()

      await expect(slot.getByTitle('Player connection status')).toHaveClass(/offline/)
    }),
  )

  await page.goto(`/games/${gameNo}`)
  await expect(page.getByLabel('Connect string')).toHaveText(/^connect ([a-z0-9\s.:]+)$/) // verify no password is leaking
  await expect(page.getByRole('link', { name: 'watch stv' })).toBeVisible()

  // extract gameserver secret
  const client = new MongoClient(process.env['MONGODB_URI']!)
  await client.connect()
  const db = client.db()
  const games = db.collection('games')
  const game = await games.findOne({ number: gameNo })
  expect(game).toBeTruthy()

  const secret = game!['logSecret']! as string
  expect(secret).toBeTruthy()

  const simulator = new GameServerSimulator()
  simulator.password = secret

  await Promise.all(
    queueUsers.map(async user => {
      const page = pages.get(user.steamId)!
      const slot = page.getByRole('link', { name: user.name })
      await expect(slot).toBeVisible()

      const steamId = new SteamID(user.steamId)
      simulator.send(
        '127.0.0.1',
        9871,
        `"${user.name}< ><21><${steamId.steam3()}><>" connected, address "127.0.0.1:27005"`,
      )

      await expect(slot.getByTitle('Player connection status')).toHaveClass(/joining/)

      simulator.send(
        '127.0.0.1',
        9871,
        `"${user.name}<21><${steamId.steam3()}><Unassigned>" joined team "Red"`,
      )

      await expect(slot.getByTitle('Player connection status')).toHaveClass(/connected/)
    }),
  )

  simulator.send('127.0.0.1', 9871, 'World triggered "Round_Start"')
  await waitABit(secondsToMilliseconds(10))
  simulator.send('127.0.0.1', 9871, 'World triggered "Game_Over" reason "Reached Win Limit"')
  simulator.send('127.0.0.1', 9871, 'Team "Red" final score "5" with "6" players')
  simulator.send('127.0.0.1', 9871, 'Team "Blue" final score "0" with "6" players')

  await Promise.all(
    queueUsers.map(async user => {
      const page = pages.get(user.steamId)!
      const gameState = page.getByLabel('Game status')
      await expect(gameState).not.toContainText('live', { ignoreCase: true })
    }),
  )
})
