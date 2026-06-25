import { beforeEach, expect, vi, describe, it } from 'vitest'
import { HttpClient } from './http-client'
import { HttpMethod } from './http-method'

const fetch = vi.hoisted(() => vi.fn())

global.fetch = fetch

describe('HttpClient', () => {
  let httpClient: HttpClient

  beforeEach(() => {
    httpClient = new HttpClient({
      baseUrl: 'http://example.com',
      params: {
        foo: 'bar',
      },
    })
  })

  it('should create', () => {
    expect(httpClient).toBeDefined()
  })

  it('should request', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          foo: 'bar',
        }),
    })

    const response = await httpClient.request(HttpMethod.GET, '/example', {})
    expect(response).toEqual({
      foo: 'bar',
    })
    expect(fetch).toHaveBeenCalledWith(new URL('http://example.com/example?foo=bar'), {
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
      method: 'GET',
    })
  })

  describe('when request URL is absolute', () => {
    it('should request', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            foo: 'bar',
          }),
      })

      const response = await httpClient.request(HttpMethod.GET, 'http://example.com/example', {})

      expect(response).toEqual({
        foo: 'bar',
      })
      expect(fetch).toHaveBeenCalledWith(new URL('http://example.com/example?foo=bar'), {
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
        method: 'GET',
      })
    })
  })

  describe('when the request fails', () => {
    it('should throw', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Internal Server Error'),
      })

      await expect(httpClient.request(HttpMethod.GET, '/example', {})).rejects.toThrowError(
        `http://example.com/example?foo=bar: 500 Internal Server Error`,
      )
    })
  })
})
