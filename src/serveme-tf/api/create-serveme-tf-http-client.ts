import { HttpClient } from './http-client'

export const createServemeTfHttpClient = (endpoint: string, apiKey: string) => {
  return new HttpClient({
    baseUrl: `https://${endpoint}/api`,
    params: {
      api_key: apiKey,
    },
  })
}
