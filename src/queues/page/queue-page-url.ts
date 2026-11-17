export function queuePageUrl(slug: string) {
  return `/q/${slug}`
}

queuePageUrl.parse = (url: string | undefined): string | undefined =>
  /^\/q\/([^/?#]+)$/.exec(url ?? '')?.[1]
