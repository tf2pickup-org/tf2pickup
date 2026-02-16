import { authUsers, expect } from '../fixtures/auth-users'
import { users } from '../data'
import { resolve } from 'node:path'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'

authUsers('skill import/export page is accessible for admins', async ({ users: userManager }) => {
  const adminPage = await userManager.getAdmin().page()
  await adminPage.goto('/admin/skill-import-export')
  await expect(adminPage.getByRole('heading', { name: 'Export player skills' })).toBeVisible()
  await expect(adminPage.getByRole('heading', { name: 'Import player skills' })).toBeVisible()
  await expect(adminPage.getByRole('link', { name: 'Download CSV' })).toBeVisible()
  await expect(adminPage.getByRole('button', { name: 'Upload and preview' })).toBeVisible()
})

authUsers(
  'skill import/export page is not accessible for non-admins',
  async ({ users: userManager }) => {
    const userPage = await userManager.getNext(u => !u.isAdmin).page()
    await userPage.goto('/admin/skill-import-export')
    await expect(userPage.getByText('403')).toBeVisible()
    await expect(userPage.getByText('Forbidden')).toBeVisible()
  },
)

authUsers('export skills downloads a CSV file', async ({ users: userManager }) => {
  const adminPage = await userManager.getAdmin().page()
  await adminPage.goto('/admin/skill-import-export')

  const downloadPromise = adminPage.waitForEvent('download')
  await adminPage.getByRole('link', { name: 'Download CSV' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/player-skills-.*\.csv/)
})

authUsers('upload CSV shows preview page', async ({ users: userManager }) => {
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

authUsers('apply import updates player skills', async ({ users: userManager, db }) => {
  const adminPage = await userManager.getAdmin().page()
  const adminSteamId = users[0].steamId
  const targetSteamId = users[1].steamId

  // Check initial state
  const initialPlayer = await db.collection('players').findOne({ steamId: targetSteamId })

  // Create CSV with new skill values
  const csvContent = `steamId,name,scout,soldier,demoman,medic
${targetSteamId},TestPlayer,7,8,9,10`

  const tmpFile = resolve(tmpdir(), `test-skills-apply-${Date.now()}.csv`)
  await writeFile(tmpFile, csvContent)

  try {
    await adminPage.goto('/admin/skill-import-export')
    await adminPage.locator('input[type="file"]').setInputFiles(tmpFile)
    await adminPage.getByRole('button', { name: 'Upload and preview' }).click()

    await expect(adminPage.getByRole('heading', { name: 'Import preview' })).toBeVisible()

    // Apply the changes
    await adminPage.getByRole('button', { name: /Apply \d+ change/ }).click()

    // Verify success message
    await expect(adminPage.getByText(/Successfully applied/)).toBeVisible()

    // Verify database was updated
    const updatedPlayer = await db.collection('players').findOne({ steamId: targetSteamId })
    expect(updatedPlayer?.['skill']).toMatchObject({
      scout: 7,
      soldier: 8,
      demoman: 9,
      medic: 10,
    })

    // Check skill history was recorded with the admin as actor
    expect(updatedPlayer?.['skillHistory']).toBeDefined()
    const skillHistory = updatedPlayer?.['skillHistory'] as { actor: string }[] | undefined
    const lastHistory = skillHistory?.at(-1)
    expect(lastHistory?.actor).toBe(adminSteamId)
  } finally {
    await unlink(tmpFile).catch(() => {
      /* ignore cleanup errors */
    })

    // Restore original skill if it existed
    if (initialPlayer?.['skill']) {
      await db
        .collection('players')
        .updateOne({ steamId: targetSteamId }, { $set: { skill: initialPlayer['skill'] } })
    }
  }
})

authUsers(
  'future player skills are stored for unregistered players',
  async ({ users: userManager, db }) => {
    const adminPage = await userManager.getAdmin().page()
    const futureSteamId = '76561198000000001' // A Steam ID that doesn't exist in the database

    // Ensure this player doesn't exist
    await db.collection('players').deleteOne({ steamId: futureSteamId })
    await db.collection('futureplayerskills').deleteOne({ steamId: futureSteamId })

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

      // Apply the changes
      await adminPage.getByRole('button', { name: /Apply \d+ change/ }).click()
      await expect(adminPage.getByText(/Successfully applied/)).toBeVisible()

      // Verify future player skill was stored
      const futureSkill = await db
        .collection('futureplayerskills')
        .findOne({ steamId: futureSteamId })
      expect(futureSkill).not.toBeNull()
      expect(futureSkill?.['skill']).toMatchObject({
        scout: 5,
        soldier: 6,
        demoman: 7,
        medic: 8,
      })
    } finally {
      await unlink(tmpFile).catch(() => {
        /* ignore cleanup errors */
      })
      await db.collection('futureplayerskills').deleteOne({ steamId: futureSteamId })
    }
  },
)
