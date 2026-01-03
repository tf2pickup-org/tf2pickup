import { test, expect } from '@playwright/test'
import { QueuePage } from '../pages/queue.page'

test('has title @6v6', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/\[0\/12\] tf2pickup\.org/)
})

test('has steam login button', async ({ page }) => {
  await page.goto('/')
  expect(page.getByRole('link', { name: 'Sign in through Steam' })).toBeTruthy()
})

test('has queue state', async ({ page }) => {
  await page.goto('/')
  const queueState = page.getByText('Players:')
  expect(queueState).toBeTruthy()
})

test('has 12 queue slots and no join buttons @6v6', async ({ page }) => {
  await page.goto('/')
  const slots = page.getByLabel(/Queue slot .+/)
  await expect(slots).toHaveCount(12)
  await expect(slots.filter({ hasNot: page.getByRole('button') })).toHaveCount(12)
  await expect(slots.filter({ has: page.getByRole('button') })).toHaveCount(0)
})

test('has 3 map vote buttons', async ({ page }) => {
  await page.goto('/')
  const mapVoteButtons = page.getByLabel(/Vote for map/)
  await expect(mapVoteButtons).toHaveCount(3)
})

test('pre-ready up button is not rendered', async ({ page }) => {
  const queuePage = new QueuePage(page)
  await queuePage.goto()
  await expect(queuePage.preReadyUpButton).not.toBeVisible()
})
