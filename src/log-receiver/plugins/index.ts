import fp from 'fastify-plugin'
import { Worker } from 'node:worker_threads'
import { events } from '../../events'
import { logger } from '../../logger'
import type { WorkerMessage, ControlMessage } from '../worker-message'

export default fp(
  async app => {
    const worker = new Worker(new URL('../log-receiver.worker.js', import.meta.url), {
      execArgv: [...process.execArgv],
    })

    worker.on('message', (msg: WorkerMessage) => {
      switch (msg.type) {
        case 'match:started':
          events.emit('match:started', { gameNumber: msg.gameNumber })
          break
        case 'match:restarted':
          events.emit('match:restarted', { gameNumber: msg.gameNumber })
          break
        case 'match:ended':
          events.emit('match:ended', { gameNumber: msg.gameNumber })
          break
        case 'match:roundWon':
          events.emit('match:roundWon', { gameNumber: msg.gameNumber, winner: msg.winner })
          break
        case 'match:roundLength':
          events.emit('match:roundLength', { gameNumber: msg.gameNumber, lengthMs: msg.lengthMs })
          break
        case 'match/logs:uploaded':
          events.emit('match/logs:uploaded', { gameNumber: msg.gameNumber, logsUrl: msg.logsUrl })
          break
        case 'match/player:connected':
          events.emit('match/player:connected', {
            gameNumber: msg.gameNumber,
            steamId: msg.steamId,
            ipAddress: msg.ipAddress,
          })
          break
        case 'match/player:joinedTeam':
          events.emit('match/player:joinedTeam', {
            gameNumber: msg.gameNumber,
            steamId: msg.steamId,
            team: msg.team,
          })
          break
        case 'match/player:disconnected':
          events.emit('match/player:disconnected', {
            gameNumber: msg.gameNumber,
            steamId: msg.steamId,
          })
          break
        case 'match/player:said':
          events.emit('match/player:said', {
            gameNumber: msg.gameNumber,
            steamId: msg.steamId,
            message: msg.message,
          })
          break
        case 'match/score:reported':
          events.emit('match/score:reported', {
            gameNumber: msg.gameNumber,
            teamName: msg.teamName,
            score: msg.score,
          })
          break
        case 'match/score:final':
          events.emit('match/score:final', {
            gameNumber: msg.gameNumber,
            team: msg.team,
            score: msg.score,
          })
          break
        case 'match/demo:uploaded':
          events.emit('match/demo:uploaded', { gameNumber: msg.gameNumber, demoUrl: msg.demoUrl })
          break
      }
    })

    worker.on('error', error => {
      logger.error({ error }, 'log receiver worker error')
    })

    app.addHook('onClose', async () => {
      await new Promise<void>((resolve, reject) => {
        worker.postMessage({ type: 'shutdown' } satisfies ControlMessage)
        worker.once('exit', resolve)
        worker.once('error', reject)
      })
    })
  },
  {
    name: 'log receiver',
  },
)
