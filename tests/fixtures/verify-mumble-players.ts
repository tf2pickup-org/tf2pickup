import { mergeTests } from '@playwright/test'
import { Client } from '@tf2pickup-org/mumble-client'
import pem from 'pem'
import { configureMumbleServer } from './configure-mumble-server'
import { expect, launchGame } from './launch-game'

export interface MumbleUser {
  client: Client
  messages: string[]
  // the address Mumble sees; every test client shares it, so pass it to the game server simulator
  address: string
}

interface Certificate {
  clientKey: string
  certificate: string
}

const createCertificate = () =>
  new Promise<Certificate>((resolve, reject) => {
    pem.createCertificate({ days: 1, selfSigned: true }, (error, result) => {
      if (error) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(error)
      } else {
        resolve(result)
      }
    })
  })

const move = 0x20
const ban = 0x20000
const register = 0x40000

export const verifyMumblePlayers = mergeTests(launchGame, configureMumbleServer).extend<{
  mumbleVerificationEnabled: void
  connectToMumble: (name: string) => Promise<MumbleUser>
}>({
  mumbleVerificationEnabled: [
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async ({ users, db, mumbleClient, mumbleServerConfigured }, use) => {
      const [bot] = mumbleClient.users.findAll(({ name }) => name === 'tf2pickup.org bot')
      if (bot?.userId === undefined) {
        throw new Error('bot is not registered')
      }

      const root = mumbleClient.channels.byId(0)!
      const acl = await root.fetchAcl()
      if (!acl.entries.some(({ userId }) => userId === bot.userId)) {
        acl.entries.push({
          applyHere: true,
          applySubs: true,
          inherited: false,
          userId: bot.userId,
          grant: move | ban | register,
          deny: 0,
        })
        await root.saveAcl(acl)
      }

      await db.collection('players').updateMany({}, { $unset: { mumbleCertificate: 1 } })

      // ponytail: left on once enabled; saving the voice server form reconnects the bot, which then
      // resyncs every game channel through its rate-limited command queue
      const setting = await db
        .collection('configuration')
        .findOne({ key: 'games.voice_server.mumble.player_verification' })
      const admin = await users.getAdmin().adminPage()
      if (setting?.['value'] !== true) {
        await admin.setMumblePlayerVerification(true)
      }

      // the defaults; other specs shorten them, and then players who aren't on the game server
      // get auto-subbed until the game is force-ended
      await admin.configureGames({ joinGameServerTimeout: 300, rejoinGameServerTimeout: 180 })

      await use()
    },
    { auto: true },
  ],
  connectToMumble: async ({ mumbleClient, mumbleConfiguration }, use) => {
    const clients: Client[] = []
    await use(async name => {
      const { clientKey, certificate } = await createCertificate()
      const client = new Client({
        host: 'localhost',
        port: mumbleConfiguration.port,
        username: name,
        rejectUnauthorized: false,
        key: clientKey,
        cert: certificate,
      })
      const messages: string[] = []
      client.on('textMessage', ({ sender, message }) => {
        if (sender?.name === 'tf2pickup.org bot') {
          messages.push(message)
        }
      })
      await client.connect()
      clients.push(client)

      const session = client.session!
      await expect.poll(() => mumbleClient.users.bySession(session)).toBeTruthy()
      const address = await mumbleClient.users.bySession(session)!.fetchAddress()
      if (!address) {
        throw new Error(`no address for ${name}`)
      }

      return { client, messages, address }
    })

    for (const client of clients) {
      client.disconnect()
    }
  },
})

export { expect }
