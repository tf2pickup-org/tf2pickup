import jwt from 'jsonwebtoken'
import { keys } from '../keys'
import { z } from 'zod'
import { steamId64 } from '../shared/schemas/steam-id-64'

const stateDataSchema = z.object({
  steamId: steamId64,
})

type StateData = z.infer<typeof stateDataSchema>

async function make(data: StateData): Promise<string> {
  const { privateKey } = await keys.get('twitch.tv state')
  return jwt.sign(data, privateKey.export({ format: 'pem', type: 'pkcs8' }), {
    algorithm: 'ES512',
    expiresIn: '5m',
  })
}

async function verify(state: string): Promise<StateData> {
  const { publicKey } = await keys.get('twitch.tv state')
  return stateDataSchema.parse(
    jwt.verify(state, publicKey.export({ format: 'pem', type: 'spki' }), {
      algorithms: ['ES512'],
    }),
  )
}

export const state = {
  make,
  verify,
} as const
