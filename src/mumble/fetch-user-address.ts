import type { User } from '@tf2pickup-org/mumble-client'

// a session's address never changes, and every fetch is a command against Mumble's rate limit
const addresses = new WeakMap<User, Promise<string | undefined>>()

export async function fetchUserAddress(user: User) {
  let address = addresses.get(user)
  if (!address) {
    address = user.fetchAddress()
    addresses.set(user, address)
    address.catch(() => addresses.delete(user))
  }
  return await address
}
