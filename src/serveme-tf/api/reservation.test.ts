import { beforeEach, expect, vi, describe, it, afterEach } from 'vitest'
import { Reservation } from './reservation'
import { Client } from './client'
import type { Response } from './types/serveme-tf-responses'
import { ReservationStatus } from './types/reservation-status'
import { secondsToMilliseconds } from 'date-fns'
import { TimeoutError } from './errors/timeout.error'

const mockReservationResponse: Response.ActiveReservation = vi.hoisted(() => ({
  status: 'Starting',
  starts_at: '2014-04-13T19:00:20.415+02:00',
  ends_at: '2014-04-13T20:00:20.415+02:00',
  server_id: 64,
  password: 'FAKE_PASSWORD',
  rcon: 'FAKE_RCON_PASSWORD',
  first_map: null,
  tv_password: 'FAKE_TV_PASSWORD',
  tv_relaypassword: 'FAKE_TV_RELAY_PASSWORD',
  server_config_id: null,
  whitelist_id: null,
  custom_whitelist_id: null,
  auto_end: true,
  id: 12345,
  last_number_of_players: 0,
  inactive_minute_counter: 0,
  logsecret: 'FAKE_LOGSECRET',
  start_instantly: false,
  end_instantly: false,
  server: {
    id: 12345,
    name: 'Server name',
    flag: 'de',
    ip: '127.0.0.1',
    port: '27015',
    ip_and_port: '127.0.0.1:27015',
    sdr: false,
    latitude: 0,
    longitude: 0,
  },
  enable_plugins: true,
  enable_demostf: true,
  provisioned: true,
  ended: false,
  steam_uid: 'FAKE_STEAM_UID',
}))

vi.mock('./client', () => {
  const Client = vi.fn()
  Client.prototype.httpClient = {
    get: vi.fn().mockResolvedValue({
      reservation: {
        ...mockReservationResponse,
        status: 'Ready',
      },
    }),
    delete: vi.fn().mockResolvedValue({
      reservation: {
        ...mockReservationResponse,
        status: 'Ending',
      },
    }),
  }
  return { Client }
})

describe('Reservation', () => {
  let client: Client
  let reservation: Reservation

  beforeEach(() => {
    client = new Client({
      apiKey: 'FAKE_API_KEY',
      endpoint: 'FAKE_SERVEME_ENDPOINT',
    })
    reservation = new Reservation(client, mockReservationResponse)
  })

  it('should create', () => {
    expect(reservation).toBeTruthy()
  })

  it('should return proper values', () => {
    expect(reservation.id).toEqual(12345)
    expect(reservation.status).toEqual(ReservationStatus.starting)
    expect(reservation.password).toEqual('FAKE_PASSWORD')
    expect(reservation.rcon).toEqual('FAKE_RCON_PASSWORD')
    expect(reservation.tvPassword).toEqual('FAKE_TV_PASSWORD')
    expect(reservation.tvRelayPassword).toEqual('FAKE_TV_RELAY_PASSWORD')
    expect(reservation.firstMap).toBe(null)
    expect(reservation.serverConfigId).toBe(null)
    expect(reservation.whitelistId).toBe(null)
    expect(reservation.customWhitelistId).toBe(null)
    expect(reservation.autoEnd).toBe(true)
    expect(reservation.sdr).toBe(null)
    expect(reservation.pluginsEnabled).toBe(true)
    expect(reservation.demosTfEnabled).toBe(true)
    expect(reservation.lastNumberOfPlayers).toBe(0)
    expect(reservation.inactiveMinuteCounter).toBe(0)
    expect(reservation.logSecret).toEqual('FAKE_LOGSECRET')
    expect(reservation.isStartedInstantly).toBe(false)
    expect(reservation.isEndedInstantly).toBe(false)
    expect(reservation.isProvisioned).toBe(true)
    expect(reservation.ended).toBe(false)
    expect(reservation.reservedBy).toEqual('FAKE_STEAM_UID')
    expect(reservation.serverId).toEqual(64)
    expect(reservation.server).toEqual({
      id: 12345,
      name: 'Server name',
      flag: 'de',
      ip: '127.0.0.1',
      port: '27015',
      ip_and_port: '127.0.0.1:27015',
      sdr: false,
      latitude: 0,
      longitude: 0,
    })
  })

  describe('#refresh()', () => {
    it('should refresh reservation details', async () => {
      await reservation.refresh()
      expect(client.httpClient.get).toHaveBeenCalledWith('/reservations/12345')
      expect(reservation.status).toEqual(ReservationStatus.ready)
    })
  })

  describe('#end()', () => {
    it('should call the API', async () => {
      await reservation.end()
      expect(client.httpClient.delete).toHaveBeenCalledWith('/reservations/12345')
      expect(reservation.status).toEqual(ReservationStatus.ending)
    })
  })

  describe('#waitForStarted()', () => {
    let refreshNo = 0

    beforeEach(() => {
      refreshNo = 0
      vi.mocked(client.httpClient).get.mockImplementation(() => {
        switch (refreshNo++) {
          case 0:
            return Promise.resolve({
              reservation: {
                ...mockReservationResponse,
                status: 'Waiting to start',
              },
            })

          case 1:
            return Promise.resolve({
              reservation: {
                ...mockReservationResponse,
                status: 'Starting',
              },
            })

          default:
            return Promise.resolve({
              reservation: {
                ...mockReservationResponse,
                status: 'Ready',
              },
            })
        }
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should wait for reservation to start', () =>
      new Promise<void>((resolve, reject) => {
        vi.useFakeTimers()
        reservation
          .waitForStarted()
          .then(() => {
            expect(reservation.status).toEqual(ReservationStatus.ready)
            resolve()
          })
          .catch(reject)
        vi.advanceTimersByTime(secondsToMilliseconds(20))
      }))

    describe('when the reservation has ended', () => {
      beforeEach(() => {
        vi.mocked(client.httpClient).get.mockResolvedValue({
          reservation: {
            ...mockReservationResponse,
            status: 'Ended',
          },
        })
      })

      it('should throw', () =>
        new Promise<void>((resolve, reject) => {
          vi.useFakeTimers()
          reservation
            .waitForStarted()
            .then(reject)
            .catch(error => {
              expect(error.message).toEqual('invalid reservation status: Ended')
              resolve()
            })
          vi.advanceTimersByTime(secondsToMilliseconds(20))
        }))
    })

    it('should timeout', async () => {
      await expect(reservation.waitForStarted(100)).rejects.toThrow(TimeoutError)
    })
  })
})
