import type { Client, User } from '@tf2pickup-org/mumble-client'

export function assertClientIsConnected(
  client: Client | undefined,
): asserts client is Client & { self: User } {
  if (!client?.self) {
    throw new Error(`mumble client not connected`)
  }
}
