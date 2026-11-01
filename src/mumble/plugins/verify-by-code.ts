import fp from 'fastify-plugin'
import { Html } from '@kitajs/html'
import { collections } from '../../database/collections'
import { MumbleVerificationMethod } from '../../database/models/player.model'
import { environment } from '../../environment'
import { events } from '../../events'
import { players } from '../../players'
import { safe } from '../../utils/safe'
import { bindCertificate } from '../bind-certificate'
import { parseVerificationCode } from '../parse-verification-code'
import { isVerificationEnabled } from '../is-verification-enabled'
import { verificationCount } from '../verification-count'

const verificationPageUrl = `${environment.WEBSITE_URL}/mumble`

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'mumble/textMessage',
      safe(async ({ sender, message, isPrivate }) => {
        if (!sender || !isPrivate) {
          return
        }

        if (!(await isVerificationEnabled())) {
          return
        }

        const code = parseVerificationCode(message)
        if (!code) {
          await sender.sendMessage(`To verify, send me the code from ${verificationPageUrl}`)
          return
        }

        if (!sender.hash) {
          await sender.sendMessage(
            `Your Mumble client didn't send a certificate. Create one in Mumble (Configure → Certificate Wizard), reconnect and send the code again. Help: ${verificationPageUrl}#new-certificate`,
          )
          return
        }

        const entry = await collections.mumbleVerificationCodes.findOne({
          code,
          expiresAt: { $gt: new Date() },
        })
        if (!entry) {
          verificationCount.add(1, {
            method: MumbleVerificationMethod.code,
            outcome: 'invalidCode',
          })
          await sender.sendMessage(
            `That code is invalid or has expired. Get a new one at ${verificationPageUrl}`,
          )
          return
        }

        const result = await bindCertificate(
          entry.player,
          sender.hash,
          MumbleVerificationMethod.code,
        )
        if (result.outcome === 'conflict') {
          await sender.sendMessage(
            `This Mumble certificate is linked to another tf2pickup account, so contact an admin. To use a different certificate, see ${verificationPageUrl}#new-certificate`,
          )
          return
        }

        await collections.mumbleVerificationCodes.deleteOne({ code })
        const { name } = await players.bySteamId(entry.player, ['name'])
        await sender.sendMessage(
          result.outcome === 'bound'
            ? `You're verified as ${Html.escapeHtml(name)}.`
            : `This certificate is already linked to your account (${Html.escapeHtml(name)}).`,
        )
      }),
    )
  },
  { name: 'mumble verification by code' },
)
