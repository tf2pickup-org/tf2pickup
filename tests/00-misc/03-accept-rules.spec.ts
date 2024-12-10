import { authUsers, expect } from '../fixtures/auth-users'
import { mergeTests } from '@playwright/test'
import { accessMongoDb } from '../fixtures/access-mongo-db'

const test = mergeTests(authUsers, accessMongoDb)

test.describe('when user has not accepted the rules yet', () => {
  test.beforeEach(async ({ db, steamIds }) => {
    const steamId = steamIds[0]!
    const players = db.collection('players')
    await players.updateOne({ steamId }, { $set: { hasAcceptedRules: false } })
  })

  test('accept rules', async ({ users }) => {
    const page = await users.getFirst().page()
    await expect(page.getByTitle('Accept rules dialog')).toBeVisible()

    const btn = page.getByRole('button', { name: 'I accept these rules' })
    await expect(btn).toBeVisible()
    await btn.click()

    await expect(page.getByTitle('Accept rules dialog')).not.toBeVisible()
  })
})
