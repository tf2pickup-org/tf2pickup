interface SteamConnect {
  server: string
  port?: number
  password?: string
}

const parseConnectString = (connect: string): SteamConnect | undefined => {
  const match = /^connect (.[^:;]+):?(\d+)?(?:;\s?password\s(.+))?$/.exec(connect)
  if (match?.[1]) {
    const ret: SteamConnect = { server: match[1] }

    if (match[2]) {
      ret.port = parseInt(match[2], 10)
    }

    if (match[3]) {
      ret.password = match[3]
    }

    return ret
  }
  return undefined
}

export const connectStringToLink = (connectString: string): string | undefined => {
  const c = parseConnectString(connectString)
  if (c) {
    let url = c.server
    if (c.port) {
      url += `:${c.port}`
    }

    if (c.password) {
      url += '/' + c.password
    }

    return `steam://connect/${url}`
  } else {
    return undefined
  }
}
