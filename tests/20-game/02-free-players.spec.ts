import { expect } from '@playwright/test'
import { secondsToMilliseconds } from 'date-fns'
import { launchGame } from '../fixtures/launch-game'
import { delay } from 'es-toolkit'

launchGame.use({ waitForStage: 'launching' })
// eslint-disable-next-line @typescript-eslint/no-unused-vars
launchGame('free players when the game ends', async ({ players, gameServer, gameNumber }) => {
  await Promise.all(
    players.map(async player => {
      const page = await player.queuePage()
      await page.goto()
      await expect(page.goBackToGameLink()).toBeVisible()
      for (let i = 0; i < 12; ++i) {
        await expect(page.slot(i).joinButton()).toBeDisabled()
      }
    }),
  )

  await gameServer.connectAllPlayers()
  await gameServer.matchStarts()
  await delay(secondsToMilliseconds(3))
  await gameServer.matchEnds()

  const medics = ['AstraGirl', 'BellBoy']

  // medics are freed before other players
  await Promise.all([
    ...medics
      .map(playerName => players.find(p => p.playerName === playerName)!)
      .map(async player => {
        const page = await player.queuePage()
        await Promise.all([
          expect(page.goBackToGameLink()).not.toBeVisible({
            timeout: secondsToMilliseconds(1),
          }),
          ...Array.from(Array(12).keys()).map(async i => {
            await expect(page.slot(i).joinButton()).toBeEnabled({
              timeout: secondsToMilliseconds(1),
            })
          }),
        ])
      }),
    ...players
      .filter(p => !medics.includes(p.playerName))
      .map(async player => {
        const page = await player.queuePage()
        await Promise.all([
          expect(page.goBackToGameLink()).toBeVisible({ timeout: secondsToMilliseconds(1) }),
          ...Array.from(Array(12).keys()).map(async i => {
            await expect(page.slot(i).joinButton()).toBeDisabled({
              timeout: secondsToMilliseconds(1),
            })
          }),
        ])
      }),
  ])

  // other players are freed after 5 seconds
  await Promise.all(
    players
      .filter(p => !medics.includes(p.playerName))
      .map(async player => {
        const page = await player.queuePage()
        await Promise.all([
          expect(page.goBackToGameLink()).not.toBeVisible({
            timeout: secondsToMilliseconds(6),
          }),
          ...Array.from(Array(12).keys()).map(async i => {
            await expect(page.slot(i).joinButton()).toBeEnabled({
              timeout: secondsToMilliseconds(6),
            })
          }),
        ])
      }),
  )
})
