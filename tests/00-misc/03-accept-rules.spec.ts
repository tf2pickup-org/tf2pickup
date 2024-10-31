import { MongoClient } from 'mongodb'
import { users } from '../data'
import { authUsers as test, expect } from '../fixtures/auth-users'

const user = users[0]

test.use({ steamIds: [user.steamId] })

test.describe('when user has not accepted the rules yet', () => {
  test.beforeEach(async ({ steamIds }) => {
    const steamId = steamIds[0]!
    const client = new MongoClient(process.env['MONGODB_URI']!)
    await client.connect()
    const db = client.db()
    const players = db.collection('players')
    await players.updateOne({ steamId }, { $set: { hasAcceptedRules: false } })
  })

  test('accept rules', async ({ steamIds, pages }) => {
    const steamId = steamIds[0]!
    const page = pages.get(steamId)!
    await page.goto('/')

    await expect(page.getByTitle('Accept rules dialog')).toBeVisible()

    const btn = page.getByRole('button', { name: 'I accept these rules' })
    await expect(btn).toBeVisible()
    await btn.click()

    await expect(page.getByTitle('Accept rules dialog')).not.toBeVisible()
  })
})
