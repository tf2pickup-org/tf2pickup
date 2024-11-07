import { expect } from '@playwright/test'
import { waitABit } from '../utils/wait-a-bit'
import { secondsToMilliseconds } from 'date-fns'
import { launchGameAndInitialize } from '../fixtures/launch-game-and-initialize'

launchGameAndInitialize(
  'free players when the game ends',
  async ({ players, gameNumber, gameServer }) => {
    await Promise.all(
      players
        .map(player => player.queuePage())
        .map(async page => {
          await page.goto()
          await expect(page.goBackToGameLink()).toBeVisible()
          for (let i = 0; i < 12; ++i) {
            await expect(page.slot(i).joinButton()).toBeDisabled()
          }
        }),
    )

    await gameServer.connectAllPlayers()
    await gameServer.matchStarts()
    await waitABit(secondsToMilliseconds(3))
    await gameServer.matchEnds()

    const medics = ['AstraGirl', 'BellBoy']

    // medics are freed before other players
    await Promise.all([
      ...medics
        .map(playerName => players.find(p => p.playerName === playerName)!)
        .map(player => player.queuePage())
        .map(async page => {
          await page.goto()
          await expect(page.goBackToGameLink()).not.toBeVisible({
            timeout: secondsToMilliseconds(1),
          })
          for (let i = 0; i < 12; ++i) {
            await expect(page.slot(i).joinButton()).toBeEnabled()
          }
        }),
      ...players
        .filter(p => !medics.includes(p.playerName))
        .map(player => player.queuePage())
        .map(async page => {
          await page.goto()
          await expect(page.goBackToGameLink()).toBeVisible()
          for (let i = 0; i < 12; ++i) {
            await expect(page.slot(i).joinButton()).toBeDisabled()
          }
        }),
    ])

    // other players are freed after 5 seconds
    await Promise.all(
      players
        .filter(p => !medics.includes(p.playerName))
        .map(player => player.queuePage())
        .map(async page => {
          await page.goto()
          await expect(page.goBackToGameLink()).not.toBeVisible({
            timeout: secondsToMilliseconds(5),
          })
          for (let i = 0; i < 12; ++i) {
            await expect(page.slot(i).joinButton()).toBeEnabled()
          }
        }),
    )
  },
)
