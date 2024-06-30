import { format } from 'date-fns'
import { createSocket, type Socket } from 'dgram'
import { Server } from 'net'

interface Address {
  host: string
  port: number
}

enum RconPacketType {
  SERVERDATA_AUTH = 3,
  SERVERDATA_EXECCOMMAND = 2,
  SERVERDATA_RESPONSE_VALUE = 0,
}

class RconPacket {
  type: RconPacketType = RconPacketType.SERVERDATA_RESPONSE_VALUE
  id = 0
  body = ''

  constructor(buffer?: Buffer) {
    if (buffer) {
      this.type = buffer.readInt32LE(8)
      this.id = buffer.readInt32LE(4)
      this.body = buffer.subarray(12).toString('ascii')
    }
  }

  toBuffer() {
    const size = 14 + this.body.length
    const buffer = Buffer.alloc(size)
    buffer.writeInt32LE(size - 4, 0)
    buffer.writeInt32LE(this.id, 4)
    buffer.writeInt32LE(this.type, 8)
    buffer.write(this.body, 12, 'ascii')
    buffer.write('\0', size - 2)
    buffer.write('\0', size - 1)
    return buffer
  }

  toString() {
    return `RconPacket { id: ${this.id}, type: ${this.type}, body: "${this.body}" }`
  }
}

export class GameServerSimulator {
  readonly socket: Socket
  server: Server
  addresses: Address[] = []
  logSecret: string | undefined

  constructor(
    readonly apiAddress: string,
    readonly secret: string,
  ) {
    this.socket = createSocket('udp4')
    this.server = new Server(socket => {
      console.log('client connected')
      socket.on('data', data => {
        const packet = new RconPacket(data)
        console.log(`packet: ${packet.toString()}`)

        switch (packet.type) {
          case RconPacketType.SERVERDATA_AUTH: {
            const response1 = new RconPacket()
            response1.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
            response1.id = packet.id
            socket.write(response1.toBuffer())

            const response2 = new RconPacket()
            response2.type = RconPacketType.SERVERDATA_EXECCOMMAND

            if (packet.body === '123456') {
              response2.id = packet.id
              console.log('authenticated')
            } else {
              response2.id = -1
              console.log('authentication failed')
            }
            socket.write(response2.toBuffer())
            break
          }

          case RconPacketType.SERVERDATA_EXECCOMMAND: {
            if (/sv_logsecret (.+)/.test(packet.body)) {
              const [, logSecret] = packet.body.match(/sv_logsecret (.+)/) ?? []
              this.logSecret = logSecret
              console.log(`logSecret: ${logSecret}`)

              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id
              response.body = `sv_logsecret ${logSecret}`
              socket.write(response.toBuffer())
            } else if (/logaddress_add (.+)/.test(packet.body)) {
              const [, address] = packet.body.match(/logaddress_add (.+)/) ?? []
              const [host, port] = address!.split(':')
              this.addresses.push({ host: host!, port: Number(port) })
              console.log(`logaddress_add: ${address}`)

              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id
              response.body = `logaddress_add ${address}`
              socket.write(response.toBuffer())
            } else {
              console.log(`command: ${packet.body}`)

              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id
              response.body = packet.body
              socket.write(response.toBuffer())
            }
            break
          }

          default: {
            break
          }
        }
      })
    })
  }

  run() {
    this.server.listen(27015)
  }

  close() {
    this.socket.close()
  }

  log(message: string) {
    this.addresses.forEach(({ host, port }) => {
      this.socket.send(this.prepareMessage(message), port, host)
    })
  }

  async sendHeartbeat() {
    const params = new URLSearchParams()
    params.set('name', 'Simulated Game Server')
    params.set('address', '127.0.0.1')
    params.set('port', '27015')
    params.set('rconPassword', '123456')
    const response = await fetch(`${this.apiAddress}/static-game-servers/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `secret ${this.secret}`,
      },
      body: params.toString(),
    })
    if (!response.ok) {
      throw new Error(`Failed to send heartbeat: ${response.statusText}`)
    }
  }

  private prepareMessage(payload: string) {
    const header = Buffer.from([255, 255, 255, 255, 0x53])
    const logSecret = Buffer.from(this.logSecret ?? '')
    const magicStringEnd = Buffer.from('L ')
    const timeStamp = format(new Date(), 'dd/MM/yyyy - HH:mm:ss')
    const payloadBuffer = Buffer.from(`${timeStamp}: ${payload}`)
    return Buffer.concat([header, logSecret, magicStringEnd, payloadBuffer, Buffer.from([0, 0])])
  }
}
