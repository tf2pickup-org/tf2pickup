import { authUsers as test } from '../fixtures/auth-users'
import { users } from '../data'
import { resolve } from 'node:path'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { expect } from '../fixtures/expect'

test('skill import/export page is accessible for admins @6v6 @9v9', async ({
  users: userManager,
}) => {
  const adminPage = await userManager.getAdmin().page()
  await adminPage.goto('/admin/skill-import-export')
  await expect(adminPage.getByRole('heading', { name: 'Export player skills' })).toBeVisible()
  await expect(adminPage.getByRole('heading', { name: 'Import player skills' })).toBeVisible()
  await expect(adminPage.getByRole('link', { name: 'Download CSV' })).toBeVisible()
  await expect(adminPage.getByRole('button', { name: 'Upload and preview' })).toBeVisible()
})

test('skill import/export page is not accessible for non-admins @6v6 @9v9', async ({
  users: userManager,
}) => {
  const userPage = await userManager.getNext(u => !u.isAdmin).page()
  await userPage.goto('/admin/skill-import-export')
  await expect(userPage.getByText('403')).toBeVisible()
  await expect(userPage.getByText('Forbidden')).toBeVisible()
})

test('export skills downloads a CSV file @6v6 @9v9', async ({ users: userManager }) => {
  const adminPage = await userManager.getAdmin().page()
  await adminPage.goto('/admin/skill-import-export')

  const downloadPromise = adminPage.waitForEvent('download')
  await adminPage.getByRole('link', { name: 'Download CSV' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/player-skills-.*\.csv/)
})

test('upload CSV shows preview page @6v6 @9v9', async ({ users: userManager }) => {
  const adminPage = await userManager.getAdmin().page()
  await adminPage.goto('/admin/skill-import-export')

  // Create a test CSV file
  const csvContent = `steamId,name,scout,soldier,demoman,medic
${users[0].steamId},${users[0].name},5,5,5,5
${users[1].steamId},${users[1].name},3,4,3,4`

  const tmpFile = resolve(tmpdir(), `test-skills-${Date.now()}.csv`)
  await writeFile(tmpFile, csvContent)

  try {
    await adminPage.locator('input[type="file"]').setInputFiles(tmpFile)
    await adminPage.getByRole('button', { name: 'Upload and preview' }).click()

    await expect(adminPage.getByRole('heading', { name: 'Import preview' })).toBeVisible()
    await expect(adminPage.getByRole('link', { name: 'Cancel' })).toBeVisible()
  } finally {
    await unlink(tmpFile).catch(() => {
      /* ignore cleanup errors */
    })
  }
})

test('apply import updates player skills @6v6 @9v9', async ({ users: userManager }) => {
  const admin = await userManager.getAdmin().adminPage()
  const adminName = users[0].name
  const targetSteamId = users[1].steamId
  await admin.updateSkill(targetSteamId, { scout: 1, soldier: 1, demoman: 1, medic: 1 })

  const csvContent = `steamId,name,scout,soldier,demoman,medic
${targetSteamId},TestPlayer,7,8,9,10`

  const tmpFile = resolve(tmpdir(), `test-skills-apply-${Date.now()}.csv`)
  await writeFile(tmpFile, csvContent)

  try {
    await admin.page.goto('/admin/skill-import-export')
    await admin.page.locator('input[type="file"]').setInputFiles(tmpFile)
    await admin.page.getByRole('button', { name: 'Upload and preview' }).click()

    await expect(admin.page.getByRole('heading', { name: 'Import preview' })).toBeVisible()
    await admin.page.getByRole('button', { name: /Apply \d+ change/ }).click()
    await expect(admin.page.getByText(/Successfully applied/)).toBeVisible()

    await admin.openPlayerToolbox(targetSteamId)
    await expect(admin.skillInput('scout')).toHaveValue('7')
    await expect(admin.skillInput('soldier')).toHaveValue('8')
    await expect(admin.skillInput('demoman')).toHaveValue('9')
    await expect(admin.skillInput('medic')).toHaveValue('10')
    await expect(
      admin
        .skillLastUpdated()
        .filter({ hasText: `Last updated by ${adminName}` })
        .filter({ hasText: '1 → 7' }),
    ).toHaveCount(1)
  } finally {
    await unlink(tmpFile).catch(() => {
      /* ignore cleanup errors */
    })
    await admin.resetSkill(targetSteamId)
  }
})

test('future player skills are listed in the import preview @6v6 @9v9', async ({
  users: userManager,
}) => {
  const adminPage = await userManager.getAdmin().page()
  const futureSteamId = '76561199999999999'

  const csvContent = `steamId,name,scout,soldier,demoman,medic
${futureSteamId},FuturePlayer,5,6,7,8`

  const tmpFile = resolve(tmpdir(), `test-future-skills-${Date.now()}.csv`)
  await writeFile(tmpFile, csvContent)

  try {
    await adminPage.goto('/admin/skill-import-export')
    await adminPage.locator('input[type="file"]').setInputFiles(tmpFile)
    await adminPage.getByRole('button', { name: 'Upload and preview' }).click()

    await expect(adminPage.getByRole('heading', { name: 'Import preview' })).toBeVisible()
    await expect(adminPage.getByRole('heading', { name: 'Future players' })).toBeVisible()

    await adminPage.getByRole('button', { name: /Apply \d+ change/ }).click()
    await expect(adminPage.getByText(/Successfully applied/)).toBeVisible()
  } finally {
    await unlink(tmpFile).catch(() => {
      /* ignore cleanup errors */
    })
  }
})
