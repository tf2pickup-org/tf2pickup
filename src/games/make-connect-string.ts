import { resolve4 } from 'dns/promises'
import { isIP } from 'net'
import { logger } from '../logger'

interface MakeConnectStringProps {
  address: string
  port: string | number
  password: string | undefined
}

export async function makeConnectString(props: MakeConnectStringProps) {
  const address = await resolveAddress(props.address)
  let connectString = `connect ${address}:${props.port}`
  if (props.password) {
    connectString += `; password ${props.password}`
  }

  return connectString
}

async function resolveAddress(address: string) {
  if (isIP(address)) {
    return address
  }

  try {
    const addresses = await resolve4(address)
    return addresses[0] ?? address
  } catch (error) {
    logger.error({ error, address }, `failed to resolve address`)
    return address
  }
}
