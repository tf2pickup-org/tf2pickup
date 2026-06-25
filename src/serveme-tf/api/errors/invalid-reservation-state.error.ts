import type { ReservationStatus } from '../types/reservation-status'

export class InvalidReservationStatusError extends Error {
  constructor(public readonly reservationStatus: ReservationStatus) {
    super(`invalid reservation status: ${reservationStatus}`)
    this.name = InvalidReservationStatusError.name
  }
}
