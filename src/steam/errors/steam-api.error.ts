export class SteamApiError extends Error {
  constructor(
    public readonly code: number,
    public override readonly message: string,
  ) {
    super(`steam API error (${code} ${message})`)
    this.name = SteamApiError.name
  }
}
