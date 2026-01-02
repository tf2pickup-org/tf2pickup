import htmx from './htmx'
import { Howl } from 'howler'

function getVolume(element: Element): number {
  const playVolume =
    element.getAttribute('data-play-sound-volume') ?? element.getAttribute('play-sound-volume')
  return playVolume ? parseFloat(playVolume) : 1.0
}

function initSound(element: Element) {
  const src = element.getAttribute('data-play-sound-src') ?? element.getAttribute('play-sound-src')
  if (!src) {
    return
  }

  const sound = new Howl({
    src: [src],
    volume: getVolume(element),
  })

  element.addEventListener('tf2pickup:soundPlay', () => {
    sound.volume(getVolume(element))
    sound.play()
  })

  element.addEventListener('tf2pickup:soundStop', () => {
    sound.stop()
  })
}

htmx.defineExtension('play-sound', {
  onEvent: (name: string, evt: Event | CustomEvent) => {
    if (name !== 'htmx:afterProcessNode') {
      return true
    }

    const element = (evt as CustomEvent<{ elt: Element }>).detail.elt
    initSound(element)
    const children = element.querySelectorAll('[data-play-sound-src], [play-sound-src]')
    for (const child of children) {
      initSound(child)
    }
    return true
  },
})
