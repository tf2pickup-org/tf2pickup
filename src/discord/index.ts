import { client } from './client'
import { environment } from '../environment'
import { makeOauthRedirectUrl } from './make-oauth-redirect-url'
import { saveUserProfile } from './save-user-profile'
import { state } from './state'

export const discord = {
  client,
  oauthEnabled: Boolean(environment.DISCORD_CLIENT_ID && environment.DISCORD_CLIENT_SECRET),
  makeOauthRedirectUrl,
  saveUserProfile,
  state,
} as const
