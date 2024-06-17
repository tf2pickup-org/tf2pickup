import { format } from 'date-fns'
import { createSocket, type Socket } from 'dgram'

export class GameServerSimulator {
  readonly socket: Socket
  password: string | undefined

  constructor() {
    this.socket = createSocket('udp4')
  }

  send(address: string, port: number, message: string) {
    this.socket.send(this.prepareMessage(message), port, address)
  }

  private prepareMessage(payload: string) {
    const header = Buffer.from([255, 255, 255, 255, 0x53])
    const password = Buffer.from(this.password ?? '')
    const magicStringEnd = Buffer.from('L ')
    const timeStamp = format(new Date(), 'dd/MM/yyyy - HH:mm:ss')
    const payloadBuffer = Buffer.from(`${timeStamp}: ${payload}`)
    return Buffer.concat([header, password, magicStringEnd, payloadBuffer, Buffer.from([0, 0])])
  }
}
