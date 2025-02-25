import { z } from 'zod'
import { environment } from '../environment'
import { errors } from '../errors'
import { returnUrl } from './return-url'

const fetchUserAccessTokenSchema = z.object({
  access_token: z.string(),
})

export async function fetchUserAccessToken(code: string) {
  if (!environment.TWITCH_CLIENT_ID || !environment.TWITCH_CLIENT_SECRET) {
    throw errors.badRequest(
      `TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET env variables are required to call this function`,
    )
  }

  const params = new URLSearchParams()
  params.set('client_id', environment.TWITCH_CLIENT_ID)
  params.set('client_secret', environment.TWITCH_CLIENT_SECRET)
  params.set('code', code)
  params.set('grant_type', 'authorization_code')
  params.set('redirect_uri', returnUrl)

  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw errors.internalServerError(`${response.status} ${response.statusText}`)
  }

  const { access_token: token } = fetchUserAccessTokenSchema.parse(await response.json())
  return token
}
