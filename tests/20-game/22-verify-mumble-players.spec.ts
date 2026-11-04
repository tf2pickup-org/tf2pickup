import type { Client } from '@tf2pickup-org/mumble-client'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import type { GameServerSimulator } from '../game-server-simulator'
import {
  expect,
  type MumbleUser,
  verifyMumblePlayers as test,
} from '../fixtures/verify-mumble-players'

test.use({ waitForStage: 'launching' })
// the bot spaces its ACL saves and moves out to stay under Mumble's message rate limit
const botTimeout = { timeout: secondsToMilliseconds(40) }

function teamChannel(
  mumbleClient: Client,
  channelName: string,
  gameNumber: number,
  gameServer: GameServerSimulator,
  playerName: string,
) {
  const team = gameServer.addedPlayers.find(({ name }) => name === playerName)!.team
  return mumbleClient.channels.byPath(channelName, `${gameNumber}`, team.toUpperCase())!
}

async function canEnter(user: MumbleUser, channelId: number) {
  try {
    await user.client.self!.moveToChannel(channelId)
    return true
  } catch {
    return false
  }
}

test.describe('mumble player verification @6v6 @9v9', () => {
  test.describe.configure({ timeout: minutesToMilliseconds(2) })

  test('links a player by IP match and keeps strangers out until the game ends @6v6 @9v9', async ({
    gameNumber,
    gameServer,
    users,
    connectToMumble,
    mumbleClient,
    mumbleConfiguration,
  }) => {
    const channel = teamChannel(
      mumbleClient,
      mumbleConfiguration.channelName,
      gameNumber,
      gameServer,
      'Astropower',
    )
    const astropower = await connectToMumble('Astropower')
    await gameServer.playerConnects('Astropower', astropower.address)

    await expect
      .poll(() => astropower.messages, botTimeout)
      .toContain("You're verified as Astropower.")
    await expect.poll(() => astropower.client.self?.channelId, botTimeout).toBe(channel.id)

    const stranger = await connectToMumble('Stranger')
    expect(await canEnter(stranger, channel.id)).toBe(false)

    const gamePage = await users.getAdmin().gamePage(gameNumber)
    await gamePage.goto()
    await gamePage.forceEnd()
    await expect.poll(() => canEnter(stranger, channel.id), botTimeout).toBe(true)
  })

  test('falls back to the verification code when the IP match is ambiguous @6v6 @9v9', async ({
    gameNumber,
    gameServer,
    users,
    connectToMumble,
    mumbleClient,
    mumbleConfiguration,
  }) => {
    const channel = teamChannel(
      mumbleClient,
      mumbleConfiguration.channelName,
      gameNumber,
      gameServer,
      'Astropower',
    )
    const astropower = await connectToMumble('Astropower')
    const spectator = await connectToMumble('Spectator')
    await gameServer.playerConnects('Astropower', astropower.address)

    await expect
      .poll(() => astropower.messages, { timeout: secondsToMilliseconds(20) })
      .toContainEqual(expect.stringContaining('/mumble'))
    expect(spectator.messages).toEqual([])

    const page = await users.byName('Astropower').page()
    await page.goto('/mumble')
    const code = await page.locator('#mumble-verification-code').textContent()
    const [bot] = astropower.client.users.findAll(({ name }) => name === 'tf2pickup.org bot')
    await bot!.sendMessage(code!)

    await expect
      .poll(() => astropower.messages, botTimeout)
      .toContain("You're verified as Astropower.")
    await expect.poll(() => astropower.client.self?.channelId, botTimeout).toBe(channel.id)
    await page.reload()
    await expect(page.locator('#mumble-verification-status')).toContainText('is linked')
  })

  test('hands the team channel over to a substitute @6v6 @9v9', async ({
    gameNumber,
    gameServer,
    users,
    connectToMumble,
    mumbleClient,
    mumbleConfiguration,
  }) => {
    const channel = teamChannel(
      mumbleClient,
      mumbleConfiguration.channelName,
      gameNumber,
      gameServer,
      'Astropower',
    )
    const astropower = await connectToMumble('Astropower')
    await gameServer.playerConnects('Astropower', astropower.address)
    await expect.poll(() => astropower.client.self?.channelId, botTimeout).toBe(channel.id)

    const adminsPage = await users.getAdmin().gamePage(gameNumber)
    const ghostWalkersPage = await users.byName('GhostWalker').gamePage(gameNumber)
    await ghostWalkersPage.goto()
    await adminsPage.requestSubstitute('Astropower')
    await ghostWalkersPage.replacePlayer('Astropower')
    await expect(gameServer).toHaveCommand(
      `sm_game_player_add ${users.byName('GhostWalker').steamId}`,
    )

    const ghostWalker = await connectToMumble('GhostWalker')
    await gameServer.playerConnects('GhostWalker', ghostWalker.address)
    await gameServer.playerJoinsTeam('GhostWalker')

    await expect
      .poll(() => ghostWalker.messages, botTimeout)
      .toContain("You're verified as GhostWalker.")
    await expect.poll(() => ghostWalker.client.self?.channelId, botTimeout).toBe(channel.id)
    await expect
      .poll(() => astropower.client.self?.channelId, botTimeout)
      .toBe(mumbleClient.channels.byName(mumbleConfiguration.channelName)!.id)
  })

  test('takes channel access away when an admin unlinks the certificate @6v6 @9v9', async ({
    gameNumber,
    gameServer,
    users,
    connectToMumble,
    mumbleClient,
    mumbleConfiguration,
  }) => {
    const channel = teamChannel(
      mumbleClient,
      mumbleConfiguration.channelName,
      gameNumber,
      gameServer,
      'Astropower',
    )
    const astropower = await connectToMumble('Astropower')
    await gameServer.playerConnects('Astropower', astropower.address)
    await expect.poll(() => astropower.client.self?.channelId, botTimeout).toBe(channel.id)

    const group = `$${astropower.client.self!.hash!}`
    const hasAccess = async () =>
      (await channel.fetchAcl()).entries.some(acl => acl.group === group)
    expect(await hasAccess()).toBe(true)

    const adminPage = await users.getAdmin().adminPage()
    await adminPage.unlinkMumbleCertificate(users.byName('Astropower').steamId)
    await expect.poll(hasAccess, botTimeout).toBe(false)
  })
})
