import type { KnownEndpoint } from './types/known-endpoint'
import { createServemeTfHttpClient } from './create-serveme-tf-http-client'
import { Reservation } from './reservation'
import type { Response } from './types/serveme-tf-responses'
import type { ReservationOptions } from './types/reservation-options'
import type { ServerId } from './types/server-option'
import type { ServerConfigId } from './types/server-config-option'
import type { WhitelistId } from './types/whitelist-option'
import { generatePassword } from './generate-password'
import { add } from 'date-fns'
import type { ReservationId } from './types/reservation-id'
import type { CreateReservationOptions } from './types/create-reservation-options'
import type { HttpClient } from './http-client'
import { HttpClientError } from './errors/http-client.error'
import { ServemeTfApiError } from './errors'

interface ClientOptions {
  apiKey: string
  endpoint: KnownEndpoint | string
}

export class Client {
  readonly endpoint: KnownEndpoint | string
  readonly httpClient: HttpClient
  private reservation?: Response.Reservation

  constructor(options: ClientOptions) {
    this.endpoint = options.endpoint
    this.httpClient = createServemeTfHttpClient(this.endpoint, options.apiKey)
  }

  async findOptions(): Promise<ReservationOptions> {
    const entryResponse = await this.httpClient.get<Response.ServemeTfEntry>('/reservations/new')

    const findServers = entryResponse.actions.find_servers

    const reservationResponse = await this.httpClient.post<Response.ServemeTfFindOptions>(
      findServers,
      {
        reservation: entryResponse.reservation,
      },
    )

    const servers = reservationResponse.servers.map(server => ({
      ...server,
      id: server.id as ServerId,
    }))
    const serverConfigs = reservationResponse.server_configs.map(config => ({
      ...config,
      id: config.id as ServerConfigId,
    }))
    const whitelists = reservationResponse.whitelists.map(whitelist => ({
      ...whitelist,
      id: whitelist.id as WhitelistId,
    }))

    return {
      servers,
      serverConfigs,
      whitelists,
    }
  }

  async create(options: CreateReservationOptions): Promise<Reservation> {
    const startsAt = options.startsAt ?? new Date()
    const endsAt = options.endsAt ?? add(startsAt, { hours: 2 })
    const rcon = this.reservation?.rcon ?? options.rcon ?? generatePassword()
    const password = this.reservation?.password ?? options.password ?? generatePassword()

    try {
      const response = await this.httpClient.post<Response.ServemeTfReservationDetails>(
        '/reservations',
        {
          reservation: {
            server_id: options.serverId,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            rcon,
            password,
            ...(options.enablePlugins && {
              enable_plugins: options.enablePlugins,
            }),
            ...(options.enableDemosTf && {
              enable_demos_tf: options.enableDemosTf,
            }),
            ...(options.firstMap && { first_map: options.firstMap }),
          },
        },
      )

      return new Reservation(this, response.reservation)
    } catch (error) {
      if (error instanceof HttpClientError) {
        const errorList = (error as HttpClientError<Response.ServemeTfFindOptions>).data.reservation
          .errors
        const message = Object.entries(errorList)
          .map(([key, value]) => `${key} ${value.error}`)
          .join('; ')
        throw new ServemeTfApiError(message, error)
      } else {
        throw error
      }
    }
  }

  async fetch(id: ReservationId): Promise<Reservation> {
    const response = await this.httpClient.get<Response.ServemeTfReservationDetails>(
      `/reservations/${id}`,
    )

    return new Reservation(this, response.reservation)
  }
}
