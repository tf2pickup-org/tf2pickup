import type { HttpClientError } from './http-client.error'

export class ServemeTfApiError extends Error {
  constructor(
    public override readonly message: string,
    public readonly httpClientError: HttpClientError,
  ) {
    super(`serveme.tf API error: ${message}`)
    this.name = ServemeTfApiError.name
  }
}
