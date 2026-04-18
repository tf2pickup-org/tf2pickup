import { z } from 'zod'

export const gameServerSelection = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('static'), id: z.string() }),
  z.object({ provider: z.literal('servemeTf'), name: z.string() }),
  z.object({
    provider: z.literal('tf2QuickServer'),
    server: z.discriminatedUnion('select', [
      z.object({ select: z.literal('existing'), serverId: z.string() }),
      z.object({ select: z.literal('new'), region: z.string() }),
    ]),
  }),
])

export type GameServerSelection = z.infer<typeof gameServerSelection>
