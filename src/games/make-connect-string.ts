interface MakeConnectStringProps {
  address: string
  port: string | number
  password: string | undefined
}

export function makeConnectString(props: MakeConnectStringProps) {
  let connectString = `connect ${props.address}:${props.port}`
  if (props.password) {
    connectString += `; password ${props.password}`
  }

  return connectString
}
