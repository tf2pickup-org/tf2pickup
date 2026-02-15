import { format, millisecondsToSeconds } from 'date-fns'
import { createSocket, type Socket } from 'dgram'
import { Server } from 'net'
import SteamID from 'steamid'
import { Mutex } from 'async-mutex'
import { delay } from 'es-toolkit'

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
  logAddresses = new Set<string>()
  logSecret: string | undefined
  commands: string[] = []
  private cvars: CVar[] = [
    new CVar('sv_password', '', 'Server password for entry into multiplayer games'),
    new CVar('tv_port', '27020', 'Host SourceTV port'),
    new CVar('tv_password', 'tv', 'SourceTV password for all clients'),
  ]
  addedPlayers: AddedPlayer[] = []
  private readonly eventDelay = 100
  private readonly sendMutex = new Mutex()
  private roundStartTimestamp = Date.now()
  private score = { red: 0, blu: 0 }

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
              const [, logSecret] = /sv_logsecret (.+)/.exec(packet.body) ?? []
              this.logSecret = logSecret
              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id
              response.body = `sv_logsecret ${logSecret}`
              socket.write(response.toBuffer())
            } else if (/logaddress_add (.+)/.test(packet.body)) {
              const [, address] = /logaddress_add (.+)/.exec(packet.body) ?? []
              this.logAddresses.add(address!)

              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id
              response.body = `logaddress_add ${address}`
              socket.write(response.toBuffer())
            } else if (/^logaddress_del (.+)/.test(packet.body)) {
              const [, address] = /logaddress_del (.+)/.exec(packet.body) ?? []
              this.logAddresses.delete(address!)

              const response = new RconPacket()
              response.type = RconPacketType.SERVERDATA_RESPONSE_VALUE
              response.id = packet.id
              response.body = packet.body
              socket.write(response.toBuffer())
            } else if (/^sm_game_player_add .+/.test(packet.body)) {
              const [, steamId64, name, team, gameClass] =
                /^sm_game_player_add (\d{17}) -name "(.+)" -team (blu|red) -class (.+)$/.exec(
                  packet.body,
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

              const [, name, value] = /^([a-z_]+)\s(.*)$/.exec(packet.body) ?? []
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
    this.logAddresses.forEach(async address => {
      const [host, port] = address.split(':')
      const release = await this.sendMutex.acquire()
      this.socket.send(this.prepareMessage(message), Number(port), host, error => {
        if (error) {
          console.error(error)
        }
        release()
      })
    })
  }

  async playerConnects(playerName: string) {
    const player = this.addedPlayers.find(player => player.name === playerName)
    if (!player) {
      throw new Error(`player not found: ${playerName}`)
    }

    const steamId3 = new SteamID(player.steamId64).steam3()
    await delay(this.eventDelay / 2)
    this.log(
      `"${player.name}<${player.userId}><${steamId3}><>" connected, address "127.0.0.1:27005"`,
    )
    await delay(this.eventDelay / 2)
  }

  async playerJoinsTeam(playerName: string) {
    const player = this.addedPlayers.find(player => player.name === playerName)
    if (!player) {
      throw new Error(`player not found: ${playerName}`)
    }

    const team = player.team === 'blu' ? 'Blue' : 'Red'
    const steamId3 = new SteamID(player.steamId64).steam3()
    await delay(this.eventDelay / 2)
    this.log(`"${player.name}<${player.userId}><${steamId3}><Unassigned>" joined team "${team}"`)
    await delay(this.eventDelay / 2)
  }

  async playerDisconnects(playerName: string) {
    const player = this.addedPlayers.find(player => player.name === playerName)
    if (!player) {
      throw new Error(`player not found: ${playerName}`)
    }

    const steamId3 = new SteamID(player.steamId64).steam3()
    await delay(this.eventDelay / 2)
    this.log(
      `"${player.name}<${player.userId}><${steamId3}><Unassigned>" disconnected (reason "Disconnect by user.")`,
    )
    await delay(this.eventDelay / 2)
  }

  async connectAllPlayers() {
    for (const player of this.addedPlayers) {
      await this.playerConnects(player.name)
      await this.playerJoinsTeam(player.name)
    }
  }

  async matchStarts() {
    await delay(this.eventDelay / 2)
    this.log('World triggered "Round_Start"')
    this.roundStartTimestamp = Date.now()
    this.score.blu = 0
    this.score.red = 0
    await delay(this.eventDelay / 2)
  }

  async matchEnds() {
    const playersPerTeam = this.addedPlayers.length / 2
    await delay(this.eventDelay / 2)
    this.log('World triggered "Game_Over" reason "Reached Win Limit"')
    this.log(`Team "Red" final score "${this.score.red}" with "${playersPerTeam}" players`)
    this.log(`Team "Blue" final score "${this.score.blu}" with "${playersPerTeam}" players`)
    await delay(this.eventDelay / 2)
  }

  async roundEnds(winner: 'blu' | 'red') {
    const playersPerTeam = this.addedPlayers.length / 2
    await delay(this.eventDelay / 2)
    const lengthMs = Date.now() - this.roundStartTimestamp
    this.score[winner] += 1
    this.log(`World triggered "Round_Win" (winner "${winner === 'blu' ? 'Blue' : 'Red'}")`)
    this.log(`World triggered "Round_Length" (seconds "${millisecondsToSeconds(lengthMs)}")`)
    this.log(`Team "Red" current score "${this.score.red}" with "${playersPerTeam}" players`)
    this.log(`Team "Blue" current score "${this.score.blu}" with "${playersPerTeam}" players`)
    this.roundStartTimestamp = Date.now()
    await delay(this.eventDelay / 2)
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
