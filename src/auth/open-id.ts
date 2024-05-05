import openid from 'openid'
import { environment } from '../environment'

export const openId = new openid.RelyingParty(
  `${environment.WEBSITE_URL}/auth/steam/return`,
  environment.WEBSITE_URL,
  true,
  true,
  [],
)
