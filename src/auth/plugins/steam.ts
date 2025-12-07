import fp from 'fastify-plugin'
import { openId } from '../open-id'
import { environment } from '../../environment'
import SteamAPI from 'steamapi'
import { logger } from '../../logger'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { players } from '../../players'

declare module '@fastify/secure-session' {
  interface SessionData {
    steamId: SteamId64
  }
}

const steamApi = new SteamAPI(environment.STEAM_API_KEY)

const getSteamLoginUrl = async (): Promise<string> =>
  new Promise((resolve, reject) => {
    openId.authenticate('https://steamcommunity.com/openid', false, (err, authUrl) => {
      if (err) {
        reject(new Error(err.message))
        return
      }

      if (!authUrl) {
        reject(new Error(`Authentication failed: authUrl is empty`))
        return
      }

      resolve(authUrl)
    })
  })

const verifySteamCallback = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    openId.verifyAssertion(url, (err, result) => {
      if (err) {
        reject(new Error(err.message))
        return
      }

      if (result?.claimedIdentifier === undefined) {
        reject(new Error(`no auth info from Steam API`))
        return
      }

      if (!result.authenticated) {
        reject(new Error(`not authenticated`))
        return
      }

      if (!/^https?:\/\/steamcommunity\.com\/openid\/id\/\d{17}$/.test(result.claimedIdentifier)) {
        reject(new Error('invalid claimedIdentifier'))
        return
      }

      const steamId = result.claimedIdentifier.split('/').pop()
      if (!steamId) {
        reject(new Error('invalid claimIdentifier'))
        return
      }

      resolve(steamId)
    })
  })

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.get('/auth/steam', async (_request, reply) => {
      const url = await getSteamLoginUrl()
      return await reply.redirect(url, 302)
    })

    app.get('/auth/steam/return', async (request, reply) => {
      const steamId = await verifySteamCallback(request.url)
      const user = await steamApi.getUserSummary(steamId)

      logger.debug({ user }, 'user logged in')
      const player = await players.upsert(user)
      request.session.set('steamId', player.steamId)

      const returnUrl = environment.WEBSITE_URL
      logger.trace({ user, player }, `redirecting to ${returnUrl}`)
      return await reply.redirect(returnUrl, 302)
    })

    app.decorateRequest('user', undefined)

    app.addHook('preHandler', async request => {
      const steamId = request.session.get('steamId')
      if (steamId) {
        try {
          const player = await players.bySteamId(steamId, [
            'steamId',
            'roles',
            'name',
            'avatar.medium',
            'preferences.soundVolume',
            'hasAcceptedRules',
            'activeGame',
            'twitchTvProfile',
          ])
          request.user = { player }
        } catch (e) {
          logger.error(e)
          request.session.regenerate()
        }
      }
    })
  },
  { name: 'auth/steam' },
)
