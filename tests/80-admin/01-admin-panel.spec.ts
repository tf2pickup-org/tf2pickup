import { authUsers, expect } from '../fixtures/auth-users'

authUsers('admin panel is visible & accessible', async ({ users }) => {
  const adminsPage = await users.getAdmin().page()
  await adminsPage.goto('/')
  await adminsPage.getByRole('link', { name: 'Admin panel' }).click()
  await adminsPage.waitForURL(/admin/)
})

authUsers('admin panel is not visible for non-admins', async ({ users }) => {
  const userPage = await users.getNext(u => !u.isAdmin).page()
  await userPage.goto('/')
  await expect(userPage.getByRole('link', { name: 'Admin panel' })).not.toBeVisible()

  await userPage.goto('/admin')
  await expect(userPage.getByText('403')).toBeVisible()
  await expect(userPage.getByText('Forbidden')).toBeVisible()
  await expect(userPage.getByRole('link', { name: 'Go back home' })).toBeVisible()
})

authUsers('admin panel is not visible for anonymous users', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Admin panel' })).not.toBeVisible()

  await page.goto('/admin')
  await expect(page.getByText('401')).toBeVisible()
  await expect(page.getByText('Unauthorized')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Go back home' })).toBeVisible()
})
;[
  '/admin/player-restrictions',
  '/admin/games',
  '/admin/map-pool',
  '/admin/game-servers',
  '/admin/voice-server',
  '/admin/discord',
  '/admin/view-for-nerds',
  '/admin/scramble-maps',
  '/admin/bypass-registration-restrictions',
  '/admin/rules',
  '/admin/privacy-policy',
].forEach(adminPage => {
  authUsers(`admin panel is not available for non-admins on ${adminPage}`, async ({ users }) => {
    const userPage = await users.getNext(u => !u.isAdmin).page()
    await userPage.goto(adminPage)
    await expect(userPage.getByText('403')).toBeVisible()
    await expect(userPage.getByText('Forbidden')).toBeVisible()
    await expect(userPage.getByRole('link', { name: 'Go back home' })).toBeVisible()
  })
})
