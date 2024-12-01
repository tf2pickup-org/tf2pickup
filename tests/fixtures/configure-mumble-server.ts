import { Client } from '@tf2pickup-org/mumble-client'
import { authUsers } from './auth-users'

interface MumbleConfiguration {
  host: string
  port: number
  channelName: string
}

export const configureMumbleServer = authUsers.extend<{
  mumbleConfiguration: MumbleConfiguration
  mumbleClient: Client
  mumbleServerConfigured: void
}>({
  mumbleConfiguration: async ({}, use) => {
    if (!('TEST_MUMBLE_SERVER_HOST' in process.env)) {
      throw new Error('TEST_MUMBLE_SERVER_HOST is required to run this test')
    }

    await use({
      host: process.env['TEST_MUMBLE_SERVER_HOST']!,
      port: 64738,
      channelName: 'tf2pickup-tests',
    })
  },
  mumbleClient: async ({}, use) => {
    const client = new Client({
      host: 'localhost',
      port: 64738,
      username: 'superuser',
      password: '123456',
      rejectUnauthorized: false,
    })
    await client.connect()
    await use(client)
    client.disconnect()
  },
  mumbleServerConfigured: [
    async ({ users, mumbleConfiguration }, use) => {
      const { channelName } = mumbleConfiguration

      const admin = await users.getAdmin().adminPage()
      await admin.configureVoiceServer({
        host: mumbleConfiguration.host,
        password: '',
        channelName,
      })
      await use()
    },
    { auto: true },
  ],
})
