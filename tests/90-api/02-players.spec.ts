import test, { expect } from '@playwright/test'

test('should return 200 for /api/players', async ({ request }) => {
  const response = await request.get('/api/players')
  expect(response.status()).toBe(200)
  const players = (await response.json()) as { steamId: string; name: string }[]
  expect(Array.isArray(players)).toBe(true)
  expect(players.length).toBeGreaterThan(0)
  expect(players[0]).toHaveProperty('steamId')
  expect(players[0]).toHaveProperty('name')
})
