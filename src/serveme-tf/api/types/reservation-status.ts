// https://github.com/Arie/serveme/blob/eae36b44258e34d98005bd452cfc7c8a3af05318/app/models/reservation.rb#L218
export enum ReservationStatus {
  unknown = 'Unknown',
  waitingToStart = 'Waiting to start',
  starting = 'Starting',
  serverUpdating = 'Server updating, please be patient',
  ready = 'Ready',
  sdrReady = 'SDR Ready',
  ending = 'Ending',
  ended = 'Ended',
}
