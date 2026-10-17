import { launchGameServeme, expect } from '../fixtures/launch-game-serveme'

launchGameServeme(
  'reserve a real serveme.tf server and report the connect info @serveme',
  async ({ gameNumber, users }, testInfo) => {
    const gamePage = await users.getAdmin().gamePage(gameNumber)
    await expect(gamePage.gameEvent('Game server assigned')).toBeVisible()
    await expect(gamePage.gameEvent('Game server initialized')).toBeVisible()

    const connectString = (await gamePage.connectString().innerText()).trim()
    expect(connectString).toMatch(/^connect .+;\s?password .+$/)

    await testInfo.attach('connect-info', {
      body: connectString,
      contentType: 'text/plain',
    })

    console.log(`\ngame #${gameNumber} is live on a real serveme.tf server`)
    console.log(`connect string: ${connectString}`)
    console.log(
      'the game stays live: connect with your TF2 client, then force-end it from the admin panel when done\n',
    )
  },
)
