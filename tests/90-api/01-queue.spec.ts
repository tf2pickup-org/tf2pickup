import test, { expect } from '@playwright/test'

test('should return 200 for /api/queue', async ({ request }) => {
  const response = await request.get('/api/queue')
  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({
    state: 'waiting',
    slots: expect.any(Array),
    mapVotes: expect.any(Object),
  })
})
