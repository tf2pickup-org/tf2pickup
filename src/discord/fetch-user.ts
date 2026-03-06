import { z } from 'zod'

const discordUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  global_name: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
})

export async function fetchUser(accessToken: string) {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })
  if (!response.ok) {
    throw new Error(`discord user request failed: ${response.status}`)
  }

  return discordUserSchema.parse(await response.json())
}
