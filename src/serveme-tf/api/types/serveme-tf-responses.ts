// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Response {
  interface ServemeTfServerOption {
    id: number
    name: string
    flag: string
    ip: string
    port: string
    ip_and_port: string
    sdr: boolean
    latitude: number
    longitude: number
  }

  // https://github.com/Arie/serveme/blob/eae36b44258e34d98005bd452cfc7c8a3af05318/app/models/reservation.rb#L218
  type ReservationStatus =
    | 'Waiting to start'
    | 'Starting'
    | 'Server updating, please be patient'
    | 'Ready'
    | 'SDR Ready' // should not happen
    | 'Ending'
    | 'Ended'
    | 'Unknown'

  export interface ReservationBounds {
    starts_at: string
    ends_at: string
  }

  export interface Reservation extends ReservationBounds {
    status: ReservationStatus
    server_id: number | null
    password: string
    rcon: string
    first_map: string | null
    tv_password: string
    tv_relaypassword: string
    server_config_id: number | null
    whitelist_id: number | null
    custom_whitelist_id: number | null
    auto_end: boolean
    sdr_ip?: string
    sdr_port?: string
    sdr_tv_port?: string
    sdr_final?: boolean
    enable_plugins: boolean
    enable_demostf: boolean
    errors: Record<string, { error: string }>
  }

  export interface ActiveReservation extends ReservationBounds {
    status: ReservationStatus
    server_id: number
    password: string
    rcon: string
    first_map: string | null
    tv_password: string
    tv_relaypassword: string
    server_config_id: number | null
    whitelist_id: number | null
    custom_whitelist_id: number | null
    auto_end: boolean
    sdr_ip?: string
    sdr_port?: string
    sdr_tv_port?: string
    sdr_final?: boolean
    enable_plugins: boolean
    enable_demostf: boolean
    id: number
    last_number_of_players: number
    inactive_minute_counter: number
    logsecret: string
    start_instantly: boolean
    end_instantly: boolean
    provisioned: boolean
    ended: boolean
    steam_uid: string
    server: ServemeTfServerOption
  }

  export interface ServemeTfEntry {
    reservation: ReservationBounds
    actions: {
      find_servers: string
    }
  }

  export interface ServemeTfFindOptions {
    reservation: Reservation
    servers: ServemeTfServerOption[]
    server_configs: { id: number; file: string }[]
    whitelists: { id: number; file: string }[]
    actions: {
      create: string
    }
  }

  export interface ServemeTfReservationDetails {
    reservation: ActiveReservation
    actions: {
      delete: string
      idle_reset: string
    }
  }
}

export const isResponseActiveReservation = (
  response: Response.Reservation | Response.ActiveReservation,
): response is Response.ActiveReservation => {
  return 'id' in response
}
