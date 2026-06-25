export class ServemeTfApiError extends Error {
  constructor(
    public readonly url: string,
    public readonly response: Response,
    public readonly detail: string,
  ) {
    super(`serveme.tf API error (${url}): ${detail}`)
    this.name = 'ServemeTfApiError'
  }
}
