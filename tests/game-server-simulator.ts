import { format } from 'date-fns'
import { createSocket, type Socket } from 'dgram'
import { Server } from 'net'

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
      this.body = buffer.subarray(12).toString('ascii').replace(/\0/g, '')
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

class CVar {
  readonly defaultValue: string
  constructor(
    public readonly name: string,
    public value = '',
    public description?: string,
  ) {
    this.defaultValue = value
  }

  toString() {
    const ret = [`"${this.name}" = "${this.value}" ( def. "${this.defaultValue}" )`]
    if (this.description) {
      ret.push(` - ${this.description}`)
    }
    return ret.join('\n')
  }
}

export class GameServerSimulator {
  private readonly socket: Socket
  private server: Server
  private addresses: string[] = []
  logSecret: string | undefined
  commands: string[] = []
  private cvars: CVar[] = [
    new CVar('sv_password', '', 'Server password for entry into multiplayer games'),
    new CVar('tv_port', '27020', 'Host SourceTV port'),
    new CVar('tv_password', 'tv', 'SourceTV password for all clients'),
  ]

  constructor(
    readonly apiAddress: string,
    readonly secret: string,
  ) {
    this.socket = createSocket('udp4')
    this.server = new Server(socket => {
      socket.on('data', data => {
        const packet = new RconPacket(data)

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
            } else {
              response2.id = -1
              console.warn('rcon authentication failed')
            }
            socket.write(response2.toBuffer())
            break
          }

          case RconPacketType.SERVERDATA_EXECCOMMAND: {
            this.commands.push(packet.body)

            if (/sv_logsecret (.+)/.test(packet.body)) {
              const [, logSecret] = packet.body.match(/sv_logsecret (.+)/) ?? []
              this.logSecret = logSecret
              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id
              response.body = `sv_logsecret ${logSecret}`
              socket.write(response.toBuffer())
            } else if (/logaddress_add (.+)/.test(packet.body)) {
              const [, address] = packet.body.match(/logaddress_add (.+)/) ?? []
              this.addresses.push(address!)

              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id
              response.body = `logaddress_add ${address}`
              socket.write(response.toBuffer())
            } else {
              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id

              const [, name, value] = packet.body.match(/^([a-z_]+)\s(.*)$/) ?? []
              if (name && this.hasCvar(name)) {
                const cvar = this.cvar(name)
                if (value) {
                  cvar.value = value
                }
                response.body = cvar.toString()
              } else {
                response.body = packet.body
              }

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

  hasCvar(name: string) {
    return this.cvars.some(cvar => cvar.name === name)
  }

  cvar(name: string): CVar {
    let cvar = this.cvars.find(cvar => cvar.name === name)
    if (!cvar) {
      cvar = new CVar(name)
      this.cvars.push(cvar)
    }
    return cvar
  }

  run() {
    this.server.listen(27015)
  }

  close() {
    this.socket.close()
  }

  log(message: string) {
    this.addresses.forEach(address => {
      const [host, port] = address.split(':')
      this.socket.send(this.prepareMessage(message), Number(port), host)
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
