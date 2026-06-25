export class HttpClientError<DataType = unknown> extends Error {
  constructor(
    public readonly url: URL,
    public readonly status: number,
    public readonly statusText: string,
    public readonly data: DataType,
  ) {
    super(`${url.toString()}: ${status} ${statusText}`)
    this.name = HttpClientError.name
  }
}
