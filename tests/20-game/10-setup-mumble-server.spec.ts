import { mergeTests } from '@playwright/test'
import { expect, launchGame } from '../fixtures/launch-game'
import { configureMumbleServer } from '../fixtures/configure-mumble-server'

const test = mergeTests(launchGame, configureMumbleServer)

test('renders join voice button', async ({
  gameNumber,
  users,
  mumbleConfiguration,
  mumbleClient,
}) => {
  const page = await users.byName('Astropower').gamePage(gameNumber)

  const joinVoiceButton = page.joinVoiceButton()
  await expect(joinVoiceButton).toBeVisible()
  await expect(joinVoiceButton).toHaveAttribute(
    'href',
    `mumble://Astropower@${mumbleConfiguration.host}:${mumbleConfiguration.port}/${mumbleConfiguration.channelName}/${gameNumber}/RED`,
  )

  expect(
    mumbleClient.channels.byPath(mumbleConfiguration.channelName, gameNumber.toString(), 'RED'),
  ).toBeTruthy()
  expect(
    mumbleClient.channels.byPath(mumbleConfiguration.channelName, gameNumber.toString(), 'BLU'),
  ).toBeTruthy()
})
