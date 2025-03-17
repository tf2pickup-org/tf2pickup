import fp from 'fastify-plugin'
import { openId } from '../open-id'
import { environment } from '../../environment'
import SteamAPI from 'steamapi'
import jwt from 'jsonwebtoken'
import { logger } from '../../logger'
import { secondsInWeek } from 'date-fns/constants'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { secrets } from '../../secrets'
import { players } from '../../players'

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
      let user = await steamApi.getUserSummary(steamId)
      if (Array.isArray(user)) {
        user = user[0]!
      }

      logger.debug({ user }, 'user logged in')
      const player = await players.upsert(user)

      const token = jwt.sign({ id: player.steamId }, await secrets.get('auth'), {
        expiresIn: '7d',
      })

      const returnUrl = request.cookies['return_url'] ?? environment.WEBSITE_URL
      logger.trace({ user }, `redirecting to ${returnUrl}`)

      return await reply
        .clearCookie('return_url')
        .setCookie('token', token, { maxAge: secondsInWeek, path: '/' })
        .redirect(returnUrl, 302)
        .send()
    })

    app.decorateRequest('user', undefined)

    app.addHook('onRequest', async (request, reply) => {
      const token = request.cookies['token']
      if (token) {
        try {
          const { id } = jwt.verify(token, await secrets.get('auth')) as { id: SteamId64 }
          const player = await players.bySteamId(id)
          request.user = { player }
        } catch (e) {
          logger.error(e)
          await reply.clearCookie('token')
        }
      }
    })
  },
  { name: 'steam' },
)
