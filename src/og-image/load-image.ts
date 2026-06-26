import { loadImage as decodeImage, type Image } from '@napi-rs/canvas'
import { secondsToMilliseconds } from 'date-fns'

export async function loadImage(
  url: string,
  timeout = secondsToMilliseconds(3),
): Promise<Image | undefined> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout) })
    if (!response.ok) {
      return undefined
    }
    return await decodeImage(Buffer.from(await response.arrayBuffer()))
  } catch {
    return undefined
  }
}
