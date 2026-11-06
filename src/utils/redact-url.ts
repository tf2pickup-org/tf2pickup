const redactedQueryParams = ['secret']

export function redactUrl(url: string) {
  const [path, query] = url.split('?', 2)
  if (query === undefined) {
    return url
  }

  const params = new URLSearchParams(query)
  for (const name of redactedQueryParams) {
    if (params.has(name)) {
      params.set(name, 'REDACTED')
    }
  }
  return `${path}?${params.toString()}`
}
