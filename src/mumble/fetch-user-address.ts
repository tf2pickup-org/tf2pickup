import type { User } from '@tf2pickup-org/mumble-client'

// a session's address never changes, and every fetch is a command against Mumble's rate limit
const addresses = new WeakMap<User, string | undefined>()

export async function fetchUserAddress(user: User) {
  if (!addresses.has(user)) {
    addresses.set(user, await user.fetchAddress())
  }
  return addresses.get(user)
}
