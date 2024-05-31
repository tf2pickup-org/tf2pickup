import fp from 'fastify-plugin'
import { openId } from './open-id'
import { environment } from '../environment'
import SteamAPI from 'steamapi'
import jwt from 'jsonwebtoken'
import { logger } from '../logger'
import { upsertPlayer } from '../players/upsert-player'
import { secondsInWeek } from 'date-fns/constants'
import { assertIsError } from '../utils/assert-is-error'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { collections } from '../database/collections'

const steamApi = new SteamAPI(environment.STEAM_API_KEY)

const getSteamLoginUrl = async (): Promise<string> =>
  new Promise((resolve, reject) => {
    openId.authenticate('https://steamcommunity.com/openid', false, (err, authUrl) => {
      if (err) {
        return reject(err)
      }

      if (!authUrl) {
        return reject(new Error(`Authentication failed: authUrl is empty`))
      }

      return resolve(authUrl)
    })
  })

const verifySteamCallback = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    openId.verifyAssertion(url, (err, result) => {
      if (err) {
        return reject(err)
      }

      if (result?.claimedIdentifier === undefined) {
        return reject(new Error(`no auth info from Steam API`))
      }

      if (!result.authenticated) {
        return reject(new Error(`not authenticated`))
      }

      if (!/^https?:\/\/steamcommunity\.com\/openid\/id\/\d{17}$/.test(result.claimedIdentifier)) {
        return reject(new Error('invalid claimedIdentifier'))
      }

      const steamId = result.claimedIdentifier.split('/').pop()
      if (!steamId) {
        return reject(new Error('invalid claimIdentifier'))
      }

      return resolve(steamId)
    })
  })

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  app.get('/auth/steam', async (_request, reply) => {
    const url = await getSteamLoginUrl()
    await reply.redirect(302, url)
  })

  app.get('/auth/steam/return', async (request, reply) => {
    try {
      const steamId = await verifySteamCallback(request.url)
      let user = await steamApi.getUserSummary(steamId)
      if (Array.isArray(user)) {
        user = user[0]!
      }

      logger.debug(`user ${user.nickname} logged in`)
      const player = await upsertPlayer(user)

      const token = jwt.sign({ id: player.steamId }, environment.AUTH_SECRET, { expiresIn: '7d' })

      let returnUrl = request.cookies['return_url']
      if (returnUrl) {
        await reply.clearCookie('return_url')
      } else {
        returnUrl = environment.WEBSITE_URL
      }
      logger.trace(`redirecting to ${returnUrl}`)

      await reply
        .setCookie('token', token, { maxAge: secondsInWeek, path: '/' })
        .redirect(302, returnUrl)
        .send()
    } catch (e) {
      assertIsError(e)
      logger.error(`failed to authenticate user: ${e.message}`)
      await reply.code(401).send('steam login failed')
    }
  })

  app.decorateRequest('user', undefined)

  app.addHook('preHandler', async (request, reply) => {
    const token = request.cookies['token']
    if (token) {
      try {
        const { id } = jwt.verify(token, environment.AUTH_SECRET) as { id: SteamId64 }
        const player = await collections.players.findOne({ steamId: id })
        if (!player) {
          throw new Error('Player not found')
        }
        request.user = { player }
      } catch (e) {
        await reply.clearCookie('token')
      }
    }
  })
})
