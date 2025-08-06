import { z } from 'zod'
import { environment } from '../environment'
import { errors } from '../errors'

const fetchUsersResponseSchema = z.object({
  data: z.tuple([
    z.object({
      broadcaster_type: z.string(),
      description: z.string(),
      display_name: z.string(),
      email: z.string(),
      id: z.string(),
      login: z.string(),
      offline_image_url: z.string(),
      profile_image_url: z.string(),
      type: z.string(),
      view_count: z.number(),
    }),
  ]),
})

type User = z.infer<typeof fetchUsersResponseSchema>['data'][0]

export async function fetchUser(accessToken: string): Promise<User> {
  if (!environment.TWITCH_CLIENT_ID || !environment.TWITCH_CLIENT_SECRET) {
    throw errors.badRequest(
      `TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET env variables are required to call this function`,
    )
  }

  const response = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-ID': environment.TWITCH_CLIENT_ID,
    },
  })
  if (!response.ok) {
    throw errors.internalServerError(`${response.status} ${response.statusText}`)
  }

  const res = fetchUsersResponseSchema.parse(await response.json())
  return res.data[0]
}
