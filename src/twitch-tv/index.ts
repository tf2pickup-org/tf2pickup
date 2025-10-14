import { environment } from '../environment'
import { makeOauthRedirectUrl } from './make-oauth-redirect-url'
import { state } from './state'
import { saveUserProfile } from './save-user-profile'

const enabled = environment.TWITCH_CLIENT_ID && environment.TWITCH_CLIENT_SECRET

export const twitchTv = {
  enabled,
  makeOauthRedirectUrl,
  saveUserProfile,
  state,
} as const
