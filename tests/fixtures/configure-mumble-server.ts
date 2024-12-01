import { Client } from '@tf2pickup-org/mumble-client'
import { authUsers } from './auth-users'

interface MumbleConfiguration {
  host: string
  port: number
  channelName: string
  superuserPassword: string
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

    if (!('TEST_MUMBLE_SERVER_SUPERUSER_PASSWORD' in process.env)) {
      throw new Error('TEST_MUMBLE_SERVER_SUPERUSER_PASSWORD is required to run this test')
    }

    await use({
      host: process.env['TEST_MUMBLE_SERVER_HOST']!,
      port: 64738,
      channelName: 'tf2pickup-tests',
      superuserPassword: process.env['TEST_MUMBLE_SERVER_SUPERUSER_PASSWORD']!,
    })
  },
  mumbleClient: async ({ mumbleConfiguration }, use) => {
    const { superuserPassword, channelName } = mumbleConfiguration
    const client = new Client({
      host: 'localhost',
      port: 64738,
      username: 'superuser',
      password: superuserPassword,
      rejectUnauthorized: false,
    })
    await client.connect()

    const channel = client.channels.byName(channelName)
    if (!channel) {
      await client.user!.channel.createSubChannel(channelName)
    }

    await use(client)
    client.disconnect()
  },
  mumbleServerConfigured: [
    async ({ users, mumbleConfiguration, mumbleClient }, use) => {
      const { channelName, host } = mumbleConfiguration

      const admin = await users.getAdmin().adminPage()
      await admin.configureVoiceServer({
        host,
        password: '',
        channelName,
      })
      const clients = mumbleClient.users.findAll(({ name }) => name === 'tf2pickup.org bot')
      if (clients.length !== 1) {
        throw new Error(`client not found`)
      }

      const client = clients[0]!
      if (!client.isRegistered) {
        await client.register()
        const channel = mumbleClient.channels.byName(channelName)
        if (!channel) {
          throw new Error(`channel not found`)
        }

        const acl = await channel.fetchAcl()
        acl.acls = [
          {
            applyHere: true,
            applySubs: true,
            inherited: false,
            userId: client.userId,
            grant: 0x41,
            deny: 0,
          },
        ]
        await channel.saveAcl(acl)
      }

      await use()
    },
    { auto: true },
  ],
})
