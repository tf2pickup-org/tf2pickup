import { environment } from '../environment'
import { errors } from '../errors'
import { returnUrl } from './return-url'

export function makeOauthRedirectUrl(state: string): string {
  if (!environment.TWITCH_CLIENT_ID) {
    throw errors.badRequest(`TWITCH_CLIENT_ID env variable is required to call this function`)
  }

  const params = new URLSearchParams()
  params.set('client_id', environment.TWITCH_CLIENT_ID)
  params.set('redirect_uri', returnUrl)
  params.set('response_type', 'code')
  params.set('scope', 'user_read')
  params.set('state', state)

  return `https://id.twitch.tv/oauth2/authorize?${params}`
}
