import fp from 'fastify-plugin'
import { client } from '../client'
import { toAdmins } from '../to-admins'
import { version } from '../../version'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  if (!client) {
    return
  }

  app.addHook('onListen', async () => {
    await toAdmins(`tf2pickup.org version ${version} started`)
  })
})
