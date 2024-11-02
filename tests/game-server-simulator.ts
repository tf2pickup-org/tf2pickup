import { format } from 'date-fns'
import { createSocket, type Socket } from 'dgram'
import { Server } from 'net'
import SteamID from 'steamid'
import { waitABit } from './utils/wait-a-bit'

const RconPacketType = {
  SERVERDATA_AUTH: 3,
  SERVERDATA_EXECCOMMAND: 2,
  SERVERDATA_AUTH_RESPONSE: 2,
  SERVERDATA_RESPONSE_VALUE: 0,
} as const

class RconPacket {
  type: (typeof RconPacketType)[keyof typeof RconPacketType] =
    RconPacketType.SERVERDATA_RESPONSE_VALUE
  id = 0
  body = ''

  constructor(buffer?: Buffer) {
    if (buffer) {
      this.type = buffer.readInt32LE(8) as (typeof RconPacketType)[keyof typeof RconPacketType]
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

class AddedPlayer {
  private static lastUserId = 0
  readonly userId: number

  constructor(
    public readonly steamId64: string,
    public readonly name: string,
    public readonly team: string,
    public readonly gameClass: string,
  ) {
    this.userId = AddedPlayer.lastUserId++
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
  addedPlayers: AddedPlayer[] = []
  private readonly eventDelay = 100

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
            response2.type = RconPacketType.SERVERDATA_AUTH_RESPONSE

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
            } else if (/^logaddress_del (.+)/.test(packet.body)) {
              const [, address] = packet.body.match(/logaddress_add (.+)/) ?? []
              if (address) {
                const index = this.addresses.indexOf(address)
                if (index > -1) {
                  this.addresses.splice(index, 1)
                }
              }

              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id
              response.body = packet.body
              socket.write(response.toBuffer())
            } else if (/^sm_game_player_add .+/.test(packet.body)) {
              const [, steamId64, name, team, gameClass] =
                packet.body.match(
                  /^sm_game_player_add (\d{17}) -name "(.+)" -team (blu|red) -class (.+)$/,
                ) ?? []
              if (steamId64 && name && team && gameClass) {
                this.addedPlayers.push(new AddedPlayer(steamId64, name, team, gameClass))
              }

              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id
              response.body = packet.body
              socket.write(response.toBuffer())
            } else if (/^sm_game_player_delall$/.test(packet.body)) {
              this.addedPlayers = []
              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id
              response.body = packet.body
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

  async run() {
    return new Promise<void>(resolve => {
      this.server.listen(27015, resolve)
    })
  }

  async close() {
    return new Promise<void>((resolve, reject) => {
      this.server.close(err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  log(message: string) {
    this.addresses.forEach(address => {
      const [host, port] = address.split(':')
      this.socket.send(this.prepareMessage(message), Number(port), host)
    })
  }

  async playerConnects(playerName: string) {
    const player = this.addedPlayers.find(player => player.name === playerName)
    if (!player) {
      throw new Error(`player not found: ${playerName}`)
    }

    const steamId3 = new SteamID(player.steamId64).steam3()
    await waitABit(this.eventDelay / 2)
    this.log(
      `"${player.name}<${player.userId}><${steamId3}><>" connected, address "127.0.0.1:27005"`,
    )
    await waitABit(this.eventDelay / 2)
  }

  async playerJoinsTeam(playerName: string) {
    const player = this.addedPlayers.find(player => player.name === playerName)
    if (!player) {
      throw new Error(`player not found: ${playerName}`)
    }

    const team = player.team === 'blu' ? 'Blue' : 'Red'
    const steamId3 = new SteamID(player.steamId64).steam3()
    await waitABit(this.eventDelay / 2)
    this.log(`"${player.name}<${player.userId}><${steamId3}><Unassigned>" joined team "${team}"`)
    await waitABit(this.eventDelay / 2)
  }

  async connectAllPlayers() {
    for (const player of this.addedPlayers) {
      await this.playerConnects(player.name)
      await this.playerJoinsTeam(player.name)
    }
  }

  async matchStarts() {
    await waitABit(this.eventDelay / 2)
    this.log('World triggered "Round_Start"')
    await waitABit(this.eventDelay / 2)
  }

  async matchEnds(score: { blu: number; red: number }) {
    await waitABit(this.eventDelay / 2)
    this.log('World triggered "Game_Over" reason "Reached Win Limit"')
    this.log(`Team "Red" final score "${score.red}" with "6" players`)
    this.log(`Team "Blue" final score "${score.blu}" with "6" players`)
    await waitABit(this.eventDelay / 2)
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
