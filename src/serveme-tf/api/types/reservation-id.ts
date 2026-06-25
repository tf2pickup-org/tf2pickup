declare const _reservationId: unique symbol
export type ReservationId = number & { [_reservationId]: never }
