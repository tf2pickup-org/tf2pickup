import htmx from './htmx'
import { Howl } from 'howler'

function maybePlaySound(element: Element) {
  const src = element.getAttribute('data-play-sound-src') ?? element.getAttribute('play-sound-src')
  if (!src) {
    return
  }

  const playVolume =
    element.getAttribute('data-play-sound-volume') ?? element.getAttribute('play-sound-volume')

  const volume = playVolume ? parseFloat(playVolume) : 1.0
  const sound = new Howl({
    src: [src],
    volume,
  })
  sound.play()
}

htmx.defineExtension('play-sound', {
  onEvent: (name: string, evt: Event | CustomEvent) => {
    if (name !== 'htmx:afterProcessNode') {
      return true
    }

    const element = (evt as CustomEvent<{ elt: Element }>).detail.elt
    maybePlaySound(element)
    const children = element.querySelectorAll('[data-play-sound-src], [play-sound-src]')
    for (const child of children) {
      maybePlaySound(child)
    }
    return true
  },
})
