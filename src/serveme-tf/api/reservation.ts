import type { Client } from './client'
import type { Response } from './types/serveme-tf-responses'
import { ReservationDetails } from './reservation-details'
import { ReservationStatus } from './types/reservation-status'
import { InvalidReservationStatusError } from './errors/invalid-reservation-state.error'
import { secondsToMilliseconds } from 'date-fns'
import { withTimeout } from './with-timeout'

export class Reservation extends ReservationDetails {
  constructor(
    public readonly client: Client,
    r: Response.ActiveReservation,
  ) {
    super(r)
  }

  async refresh(): Promise<this> {
    const response = await this.client.httpClient.get<Response.ServemeTfReservationDetails>(
      `/reservations/${this.id}`,
    )

    this.setResponse(response.reservation)
    return this
  }

  async end(): Promise<this> {
    const response = await this.client.httpClient.delete<Response.ServemeTfReservationDetails>(
      `/reservations/${this.id}`,
    )

    this.setResponse(response.reservation)
    return this
  }

  async waitForStarted(timeoutMs = secondsToMilliseconds(30)): Promise<this> {
    let interval: ReturnType<typeof setInterval>
    return withTimeout(
      new Promise<this>((resolve, reject) => {
        interval = setInterval(async () => {
          await this.refresh()

          if ([ReservationStatus.ending, ReservationStatus.ended].includes(this.status)) {
            reject(new InvalidReservationStatusError(this.status))
            return
          }

          if ([ReservationStatus.ready, ReservationStatus.sdrReady].includes(this.status)) {
            resolve(this)
            return
          }
        }, secondsToMilliseconds(5))
      }),
      timeoutMs,
    ).finally(() => {
      clearInterval(interval)
    })
  }
}
