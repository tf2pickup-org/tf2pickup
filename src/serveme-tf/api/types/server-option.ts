declare const _serverId: unique symbol
export type ServerId = number & { [_serverId]: never }

export interface ServerOption {
  id: ServerId
  name: string
  flag: string
  ip: string
  port: string
  ip_and_port: string
  sdr: boolean
  latitude: number
  longitude: number
}
