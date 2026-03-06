import { environment } from '../environment'

export async function fetchUserAccessToken(code: string): Promise<string> {
  if (!environment.DISCORD_CLIENT_ID || !environment.DISCORD_CLIENT_SECRET) {
    throw new Error(
      `DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET env variables are required to call this function`,
    )
  }

  const params = new URLSearchParams()
  params.set('client_id', environment.DISCORD_CLIENT_ID)
  params.set('client_secret', environment.DISCORD_CLIENT_SECRET)
  params.set('grant_type', 'authorization_code')
  params.set('code', code)
  params.set('redirect_uri', `${environment.WEBSITE_URL}/discord/auth/return`)

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  if (!response.ok) {
    throw new Error(`discord oauth token request failed: ${response.status}`)
  }

  const body = (await response.json()) as { access_token?: string }
  if (!body.access_token) {
    throw new Error('discord oauth token missing access_token')
  }

  return body.access_token
}
