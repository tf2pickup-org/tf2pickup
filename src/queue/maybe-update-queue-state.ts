import { secondsToMilliseconds } from 'date-fns'
import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { logger } from '../logger'
import { kick } from './kick'
import { setState } from './set-state'
import { getState } from './get-state'
import { unready } from './unready'

let timer: ReturnType<typeof setTimeout> | undefined

export async function maybeUpdateQueueState() {
  const state = await getState()
  const [currentPlayerCount, readyPlayerCount, requiredPlayerCount] = await Promise.all([
    collections.queueSlots.countDocuments({ player: { $ne: null } }),
    collections.queueSlots.countDocuments({ ready: { $eq: true } }),
    collections.queueSlots.countDocuments(),
  ])

  logger.debug(`${currentPlayerCount}/${requiredPlayerCount}`)

  switch (state) {
    case QueueState.waiting: {
      if (currentPlayerCount === requiredPlayerCount) {
        logger.info('queue full, wait for players to ready up')
        await readyUp()
      }

      break
    }

    case QueueState.ready: {
      if (currentPlayerCount === 0) {
        await unreadyQueue()
      } else if (readyPlayerCount === requiredPlayerCount) {
        logger.info('all players ready, queue ready')
        await setState(QueueState.launching)
        clearTimeout(timer)
      }

      break
    }
  }
}

async function kickUnreadyPlayers() {
  const unreadyPlayers = (
    await collections.queueSlots.find({ player: { $ne: null }, ready: { $eq: false } }).toArray()
  ).map(slot => slot.player!)
  await kick(...unreadyPlayers)
}

async function unreadyQueue() {
  logger.info('unready queue')
  await setState(QueueState.waiting)
  const allPlayers = (await collections.queueSlots.find({ player: { $ne: null } }).toArray()).map(
    slot => slot.player!,
  )
  await unready(...allPlayers)
  clearTimeout(timer)
}

async function readyUpTimeout() {
  logger.info('ready up timeout, kick players that are not ready')
  await kickUnreadyPlayers()
  clearTimeout(timer)

  // const readyStateTimeout = await configuration.get('queue.ready_state_timeout')
  const readyStateTimeout = secondsToMilliseconds(60)
  // const readyUpTimeout = await configuration.get('queue.ready_up_timeout')
  const readyUpTimeout = secondsToMilliseconds(40)

  const nextTimeout = readyStateTimeout - readyUpTimeout

  if (nextTimeout > 0) {
    timer = setTimeout(unreadyQueue, nextTimeout)
  } else {
    await unreadyQueue()
  }
}

async function readyUp() {
  await setState(QueueState.ready)
  // const timeout = await configuration.get('queue.ready_up_timeout')
  const timeout = secondsToMilliseconds(40)

  clearTimeout(timer)
  timer = setTimeout(readyUpTimeout, timeout)
}
