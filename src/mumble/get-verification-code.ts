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
  const existing = await collections.mumbleVerificationCodes.findOne({
    player,
    expiresAt: { $gt: now },
  })
  if (existing) {
    return existing
  }

  const code: MumbleVerificationCodeModel = {
    code: generateCode(),
    player,
    expiresAt: addMinutes(now, codeTtlMinutes),
  }
  await collections.mumbleVerificationCodes.replaceOne({ player }, code, { upsert: true })
  return code
}
