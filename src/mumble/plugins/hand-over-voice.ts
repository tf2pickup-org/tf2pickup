import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { PlayerConnectionStatus } from '../../database/models/game-slot.model'
import { GameState } from '../../database/models/game.model'
import { events } from '../../events'
import { games } from '../../games'
import { safe } from '../../utils/safe'
import { isVerificationEnabled } from '../is-verification-enabled'
import { settleVoiceHandover } from '../settle-voice-handover'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:playerReplaced',
      safe(async ({ game, replacee, replacement, slotId }) => {
        if (replacee === replacement || !(await isVerificationEnabled())) {
          return
        }

        const slot = game.slots.find(({ id }) => id === slotId)
        // a replacee who takes the slot back is no longer outgoing
        const voiceOutgoing = [
          ...(slot?.voiceOutgoing ?? []).filter(
            player => player !== replacement && player !== replacee,
          ),
          replacee,
        ]
        await games.update(
          game.number,
          { $set: { 'slots.$[slot].voiceOutgoing': voiceOutgoing } },
          { arrayFilters: [{ 'slot.id': slotId }] },
        )
      }),
    )

    events.on(
      'game:playerConnectionStatusUpdated',
      safe(async ({ game, playerConnectionStatus }) => {
        if (
          playerConnectionStatus === PlayerConnectionStatus.connected &&
          (await isVerificationEnabled())
        ) {
          await settleVoiceHandover(game.number)
        }
      }),
    )

    events.on(
      'mumble/userMoved',
      safe(async ({ user }) => {
        if (!user.hash || !(await isVerificationEnabled())) {
          return
        }

        const player = await collections.players.findOne(
          { 'mumbleCertificate.hash': user.hash },
          { projection: { steamId: 1 } },
        )
        const game =
          player &&
          (await collections.games.findOne(
            {
              state: { $in: [GameState.launching, GameState.started] },
              'slots.player': player.steamId,
              'slots.voiceOutgoing.0': { $exists: true },
            },
            { projection: { number: 1 } },
          ))
        if (game) {
          await settleVoiceHandover(game.number)
        }
      }),
    )
  },
  { name: 'mumble voice handover' },
)
