declare const _serverConfigOptionId: unique symbol
export type ServerConfigId = number & { [_serverConfigOptionId]: never }

export interface ServerConfigOption {
  id: ServerConfigId
  file: string
}
