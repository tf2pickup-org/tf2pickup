import { addMinutes } from 'date-fns'
import { customAlphabet } from 'nanoid'
import { collections } from '../database/collections'
import type { MumbleVerificationCodeModel } from '../database/models/mumble-verification-code.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

import { verificationCodeFormat } from './verification-code-format'

const codeTtlMinutes = 10
const generateCode = customAlphabet(verificationCodeFormat.alphabet, verificationCodeFormat.length)

export async function getVerificationCode(player: SteamId64): Promise<MumbleVerificationCodeModel> {
  const now = new Date()
  const fresh = { $gt: ['$expiresAt', now] }
  // an upsert matching the unique player index by equality is retried by mongo on a duplicate key,
  // so concurrent callers all get the same persisted code
  const code = await collections.mumbleVerificationCodes.findOneAndUpdate(
    { player },
    [
      {
        $set: {
          code: { $cond: [fresh, '$code', generateCode()] },
          expiresAt: { $cond: [fresh, '$expiresAt', addMinutes(now, codeTtlMinutes)] },
        },
      },
    ],
    { upsert: true, returnDocument: 'after' },
  )
  return code!
}
