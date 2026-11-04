import htmx from './htmx'
import { Howl, Howler } from 'howler'
import { playExclusively } from './play-exclusively'

interface HtmxNodeInternalData {
  sound?: Howl
}

let api: {
  getInternalData: (elt: Element) => HtmxNodeInternalData
}

function loadSound(element: Element) {
  const src = element.getAttribute('data-sound-src')
  if (!src) return
  const internalData = api.getInternalData(element)
  if (internalData.sound) return
  // html5: true is intentionally omitted — HTML5 Audio fetches on every play() call,
  // which causes autoplay rejection in background tabs before the fetch completes (#633).
  internalData.sound = new Howl({ src: [src] })
}

async function resumeAndPlay(sound: Howl, soundId: string) {
  if (Howler.ctx.state === 'suspended') {
    await Howler.ctx.resume().catch(console.warn)
  }
  // Resuming first means a tab that cannot unlock its audio context drops out before
  // racing for the sound, instead of winning it and swallowing the notification.
  if (Howler.ctx.state !== 'running') return
  await playExclusively(soundId, () => sound.play())
}

export function playSound(element: Element | null, volume?: number) {
  if (!element?.id) return
  const sound = api.getInternalData(element).sound
  if (!sound) return
  if (volume !== undefined) sound.volume(volume)
  void resumeAndPlay(sound, element.id)
}

export function stopSound(element: Element | null) {
  if (!element) return
  api.getInternalData(element).sound?.stop()
}

function maybePlaySound(element: Element) {
  const targetId = element.getAttribute('data-sound-play')
  if (!targetId) return
  const volumeAttr = element.getAttribute('data-sound-volume')
  const volume = volumeAttr !== null ? parseFloat(volumeAttr) : undefined
  playSound(document.getElementById(targetId), volume)
}

htmx.defineExtension('play-sound', {
  init: apiRef => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    api = apiRef
    for (const el of document.querySelectorAll('[data-sound-src]')) {
      loadSound(el)
    }
  },
  onEvent: (name: string, evt: Event | CustomEvent) => {
    if (name !== 'htmx:afterProcessNode') return true

    const element = (evt as CustomEvent<{ elt: Element }>).detail.elt
    loadSound(element)
    maybePlaySound(element)

    for (const child of element.querySelectorAll('[data-sound-src]')) {
      loadSound(child)
    }
    for (const child of element.querySelectorAll('[data-sound-play]')) {
      maybePlaySound(child)
    }
    return true
  },
})
