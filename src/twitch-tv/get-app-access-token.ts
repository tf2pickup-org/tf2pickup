import { add, isAfter } from 'date-fns'
import { environment } from '../environment'

interface AppAccessTokenResponse {
  access_token: string
  expires_in: number
  token_type: 'bearer'
}

const twitchOauth2TokenUrl = 'https://id.twitch.tv/oauth2/token'

let appAccessToken: string | null = null
let appAccessTokenExpiresAt = new Date()

export async function getAppAccessToken() {
  if (appAccessToken === null || isAfter(new Date(), appAccessTokenExpiresAt)) {
    const url = new URL(twitchOauth2TokenUrl)
    url.searchParams.append('client_id', environment.TWITCH_CLIENT_ID!)
    url.searchParams.append('client_secret', environment.TWITCH_CLIENT_SECRET!)
    url.searchParams.append('grant_type', 'client_credentials')

    const response = await fetch(url, {
      method: 'POST',
      body: null,
    })

    if (!response.ok) {
      throw new Error(`failed to get app access token: ${response.statusText}`)
    }

    const data = (await response.json()) as AppAccessTokenResponse
    appAccessToken = data.access_token
    appAccessTokenExpiresAt = add(new Date(), { seconds: data.expires_in })
  }

  return appAccessToken
}
