export const isAbsoluteUrl = (url: string) => {
  return url.startsWith('http://') || url.startsWith('https://')
}
