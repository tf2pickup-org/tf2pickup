import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Client } from './client'
import { KnownEndpoint } from './types/known-endpoint'
import type { ServerId } from './types/server-option'
import { HttpClientError, ServemeTfApiError } from './errors'
import type { ReservationId } from './types/reservation-id'

vi.mock('./http-client', () => {
  const HttpClient = vi.fn()
  HttpClient.prototype.get = vi.fn().mockResolvedValue({
    reservation: {
      starts_at: '2014-04-13T18:00:20.415+02:00',
      ends_at: '2014-04-13T20:00:20.415+02:00',
    },
    actions: {
      find_servers: 'https://serveme.tf/api/reservations/find_servers',
    },
  })
  return { HttpClient }
})

describe('Client', () => {
  let client: Client

  beforeEach(() => {
    client = new Client({
      apiKey: 'test',
      endpoint: KnownEndpoint.europe,
    })
  })

  it('should exist', () => {
    expect(client).toBeDefined()
  })

  describe('#findOptions', () => {
    beforeEach(() => {
      client.httpClient.post = vi.fn().mockResolvedValue({
        reservation: {
          starts_at: '2014-04-13T18:00:20.415+02:00',
          ends_at: '2014-04-13T20:00:20.415+02:00',
          server_id: null,
          password: null,
          rcon: null,
          first_map: null,
          tv_password: 'tv',
          tv_relaypassword: 'tv',
          server_config_id: null,
          whitelist_id: null,
          custom_whitelist_id: null,
          auto_end: true,
        },
        servers: [
          {
            id: 64,
            name: 'FritzBrigade #10',
            location: {
              id: 8,
              name: 'Germany',
              flag: 'de',
            },
          },
        ],
        server_configs: [
          {
            id: 2,
            file: 'etf2l_6v6',
          },
          {
            id: 3,
            file: 'etf2l_9v9',
          },
        ],
        whitelists: [
          {
            id: 2,
            file: 'etf2l_whitelist_6v6.txt',
          },
          {
            id: 3,
            file: 'etf2l_whitelist_9v9.txt',
          },
        ],
        actions: {
          create: 'https://serveme.tf/api/reservations',
        },
      })
    })

    it('should find options', async () => {
      const result = await client.findOptions()
      expect(result).toEqual({
        servers: [
          {
            id: 64,
            name: 'FritzBrigade #10',
            location: {
              id: 8,
              name: 'Germany',
              flag: 'de',
            },
          },
        ],
        serverConfigs: [
          {
            id: 2,
            file: 'etf2l_6v6',
          },
          {
            id: 3,
            file: 'etf2l_9v9',
          },
        ],
        whitelists: [
          {
            id: 2,
            file: 'etf2l_whitelist_6v6.txt',
          },
          {
            id: 3,
            file: 'etf2l_whitelist_9v9.txt',
          },
        ],
      })
    })

    it('should call the API', async () => {
      await client.findOptions()
      expect(client.httpClient.get).toHaveBeenCalledWith('/reservations/new')
      expect(client.httpClient.post).toHaveBeenCalledWith(
        'https://serveme.tf/api/reservations/find_servers',
        {
          reservation: {
            starts_at: '2014-04-13T18:00:20.415+02:00',
            ends_at: '2014-04-13T20:00:20.415+02:00',
          },
        },
      )
    })
  })

  describe('#create', () => {
    beforeEach(() => {
      client.httpClient.post = vi.fn().mockResolvedValue({
        reservation: {
          starts_at: '2014-04-13T19:00:20.415+02:00',
          ends_at: '2014-04-13T20:00:20.415+02:00',
          server_id: 64,
          password: 'bar',
          rcon: 'foo',
          first_map: null,
          tv_password: 'tv',
          tv_relaypassword: 'tv',
          server_config_id: null,
          whitelist_id: null,
          custom_whitelist_id: null,
          auto_end: true,
          id: 12345,
          last_number_of_players: 0,
          inactive_minute_counter: 0,
          logsecret: '298424416816498481223654962917404607282',
          start_instantly: false,
          end_instantly: false,
          server: {
            name: 'Server name',
            ip_and_port: '127.0.0.1:27015',
          },
          errors: {},
        },
        actions: {
          delete: 'https://serveme.tf/api/reservations/12345',
        },
      })
    })

    it('should create a reservation', async () => {
      const result = await client.create({
        serverId: 64 as ServerId,
        startsAt: new Date('2014-04-13T19:00:20.415+02:00'),
        endsAt: new Date('2014-04-13T20:00:20.415+02:00'),
      })
      expect(result).toBeDefined()
      expect(result.id).toEqual(12345)
    })

    it('should call the API', async () => {
      await client.create({
        serverId: 64 as ServerId,
        startsAt: new Date('2014-04-13T19:00:20.415+02:00'),
        endsAt: new Date('2014-04-13T20:00:20.415+02:00'),
      })
      expect(client.httpClient.post).toHaveBeenCalledWith('/reservations', {
        reservation: {
          server_id: 64,
          starts_at: '2014-04-13T17:00:20.415Z',
          ends_at: '2014-04-13T18:00:20.415Z',
          rcon: expect.any(String),
          password: expect.any(String),
        },
      })
    })

    describe('when the API returns an error', () => {
      beforeEach(() => {
        client.httpClient.post = vi.fn().mockImplementation(url => {
          throw new HttpClientError(new URL(`https://serveme.tf/api/${url}`), 400, 'Bad Request', {
            reservation: {
              starts_at: '2014-04-13T18:00:20.415+02:00',
              ends_at: '2014-04-13T20:00:20.415+02:00',
              server_id: null,
              password: 'bar',
              rcon: 'foo',
              first_map: null,
              tv_password: 'tv',
              tv_relaypassword: 'tv',
              server_config_id: null,
              whitelist_id: null,
              custom_whitelist_id: null,
              auto_end: true,
              errors: {
                server: {
                  error: "can't be blank",
                },
                starts_at: {
                  error: "can't be more than 15 minutes in the past",
                },
              },
            },
            actions: {
              create: 'https://serveme.tf/api/reservations',
            },
            servers: [
              {
                id: 64,
                name: 'FritzBrigade #10',
                flag: 'de',
              },
            ],
            server_configs: [
              {
                id: 19,
                file: 'wptf2l',
              },
            ],
            whitelists: [
              {
                id: 9,
                file: 'wp9v9_whitelist.txt',
              },
            ],
          })
        })
      })

      it('should throw an error', async () => {
        await expect(
          client.create({
            serverId: 64 as ServerId,
            startsAt: new Date('2014-04-13T19:00:20.415+02:00'),
            endsAt: new Date('2014-04-13T20:00:20.415+02:00'),
          }),
        ).rejects.toThrow(ServemeTfApiError)
      })
    })
  })

  describe('#fetch()', () => {
    beforeEach(() => {
      client.httpClient.get = vi.fn().mockResolvedValue({
        reservation: {
          starts_at: '2014-04-13T19:00:20.415+02:00',
          ends_at: '2014-04-13T20:00:20.415+02:00',
          server_id: 64,
          password: 'bar',
          rcon: 'foo',
          first_map: null,
          tv_password: 'tv',
          tv_relaypassword: 'tv',
          server_config_id: null,
          whitelist_id: null,
          custom_whitelist_id: null,
          auto_end: true,
          id: 12345,
          last_number_of_players: 0,
          inactive_minute_counter: 0,
          logsecret: '298424416816498481223654962917404607282',
          start_instantly: false,
          end_instantly: false,
          server: {
            name: 'Server name',
            ip_and_port: '127.0.0.1:27015',
          },
          errors: {},
        },
        actions: {
          delete: 'https://serveme.tf/api/reservations/12345',
        },
      })
    })

    it('should fetch a reservation', async () => {
      const result = await client.fetch(12345 as ReservationId)
      expect(result).toBeDefined()
      expect(result.id).toEqual(12345)
    })

    it('should call the API', async () => {
      await client.fetch(12345 as ReservationId)
      expect(client.httpClient.get).toHaveBeenCalledWith('/reservations/12345')
    })
  })
})
