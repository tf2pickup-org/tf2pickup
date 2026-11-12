import { expect, queues } from '../fixtures/queues'

// ultiduo and bball games are not balanced by skill, so players have no skill there
const test = queues.extend<{ ultiduo: string }>({
  ultiduo: [
    async ({ queues }, use) => {
      const { slug } = await queues.create({ template: 'auto-ultiduo', enable: true })
      await use(slug)
    },
    { auto: true },
  ],
})

test('an ultiduo queue has no skill threshold @multi-queue', async ({ users, ultiduo }) => {
  const page = await users.getAdmin().page()
  await page.goto(`/admin/queues/${ultiduo}`)
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Player skill threshold', { exact: true })).toHaveCount(0)

  const response = await page.request.post('/admin/view-for-nerds/queues', {
    form: { key: `queues.${ultiduo}.skillThreshold`, value: '2' },
  })
  expect(response.status()).toBe(400)
})

test('players have no ultiduo skill @multi-queue', async ({ users }) => {
  const page = await users.getAdmin().page()
  const player = users.byName('MoonMan')

  await page.goto('/admin/player-restrictions')
  await expect(page.getByLabel('Default 6v6 skill on scout')).toBeVisible()
  await expect(page.getByLabel(/^Default ultiduo skill on/)).toHaveCount(0)

  await page.goto(`/players/${player.steamId}`)
  await page.locator('#player-admin-toolbox summary').click()
  await expect(page.getByLabel("Player's skill on scout")).toBeVisible()
  await expect(page.getByLabel(/ultiduo skill on/)).toHaveCount(0)

  const skill = await page.request.post(`/players/${player.steamId}/edit/skill`, {
    form: { gamemode: 'ultiduo', 'skill.soldier': '3', 'skill.medic': '3' },
  })
  expect(skill.status()).toBe(400)

  await page.goto('/admin/skill-import-export')
  await expect(page.getByRole('link', { name: 'ultiduo', exact: true })).toHaveCount(0)
  const skills = await page.request.get('/admin/skill-import-export/export?gamemode=ultiduo')
  expect(skills.status()).toBe(400)
})
