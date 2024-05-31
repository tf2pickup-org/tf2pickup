import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/\[0\/12\] tf2pickup\.org/)
})

test('has queue state', async ({ page }) => {
  await page.goto('/')
  const queueState = page.getByText('Players:')
  expect(queueState).toBeTruthy()
})

test('has steam login button', async ({ page }) => {
  await page.goto('/')
  expect(page.getByRole('link', { name: 'Sign in through Steam' })).toBeTruthy()
})
