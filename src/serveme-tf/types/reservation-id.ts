declare const reservationIdBrand: unique symbol

export type ReservationId = number & { readonly [reservationIdBrand]: never }
