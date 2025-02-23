import { chunk } from 'es-toolkit'
import { environment } from '../environment'
import { getAppAccessToken } from './get-app-access-token'
import { getStreamsResponseSchema } from './schemas/get-streams-response.schema'
import type { Stream } from './types/stream'

const twitchTvApiUrl = 'https://api.twitch.tv/helix'

const withTwitchTvAuth = async (input: string | URL | Request, init?: RequestInit) =>
  fetch(input, {
    ...init,
    headers: {
      // eslint-disable-next-line @typescript-eslint/no-misused-spread
      ...init?.headers,
      Authorization: `Bearer ${await getAppAccessToken()}`,
      'Client-ID': environment.TWITCH_CLIENT_ID!,
    },
  })

export async function getStreams(params: {
  userIds: string[]
  userLogins: string[]
  type?: 'all' | 'live'
}): Promise<Stream[]> {
  // https://dev.twitch.tv/docs/api/reference#get-streams
  const queryParams = new URLSearchParams()
  if (params.type) {
    queryParams.set('type', params.type)
  }

  // twitch.tv API allows up to 100 user_ids or user_logins per request
  const userIdsChunks = chunk(params.userIds, 100)
  const userLoginsChunks = chunk(params.userLogins, 100)

  const responses = await Promise.all([
    ...userIdsChunks.map(async userIds => {
      if (userIds.length === 0) {
        return null
      }
      const q = new URLSearchParams(queryParams)
      userIds.forEach(userId => {
        q.append('user_id', userId)
      })
      return await withTwitchTvAuth(new URL(`${twitchTvApiUrl}/streams?${q}`))
    }),
    ...userLoginsChunks.map(async userLogins => {
      if (userLogins.length === 0) {
        return null
      }
      const q = new URLSearchParams(queryParams)
      userLogins.forEach(userLogin => {
        q.append('user_login', userLogin)
      })
      return await withTwitchTvAuth(new URL(`${twitchTvApiUrl}/streams?${q}`))
    }),
  ])

  const data = await Promise.all(
    responses
      .filter(r => r !== null)
      .map(async response => await getStreamsResponseSchema.parseAsync(await response.json())),
  )
  return data.flatMap(({ data }) => data)
}
