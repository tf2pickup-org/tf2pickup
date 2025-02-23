export interface LogMessage {
  payload: string
  password: string
}

/**
 * This code is based on srcds-log-receiver, specifically this file:
 * https://github.com/OpenSourceLAN/srcds-log-receiver/blob/master/PacketParser.ts
 */

const packetHeader = Buffer.from([255, 255, 255, 255])
const magicStringEndHeader = 'L '

const extractPassword = (message: Buffer): string | null => {
  const start = packetHeader.length + 1
  const end = message.indexOf(magicStringEndHeader)
  if (end < 0) {
    return null
  } else {
    return message.subarray(start, end).toString()
  }
}

const extractPayload = (message: Buffer): string | null => {
  let start = message.indexOf(magicStringEndHeader)
  if (start < 0) {
    return null
  }
  start += magicStringEndHeader.length
  return message.subarray(start, message.length - 2).toString()
}

export const parseLogMessage = (message: Buffer): LogMessage => {
  if (message.length < 16) {
    throw new Error('message too short')
  }

  if (message.subarray(0, 4).compare(packetHeader) !== 0) {
    throw new Error('bad header')
  }

  const packetType = message[4]
  if (packetType !== 0x53) {
    throw new Error('no password')
  }

  const password = extractPassword(message)
  if (password === null) {
    throw new Error('invalid password')
  }

  const payload = extractPayload(message)
  if (payload === null) {
    throw new Error('no payload')
  }

  return { payload, password }
}
