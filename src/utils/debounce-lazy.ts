import { debounce } from 'es-toolkit'

/**
 * Wrap a per-key handler so each distinct key gets its own debounced timer.
 * Calling the returned function with a key debounces invocations for that key
 * independently of the other keys. Used to debounce per-gamemode work.
 */
export function debounceLazy<K>(fn: (key: K) => void, ms: number): (key: K) => void {
  const debounced = new Map<K, () => void>()
  return (key: K) => {
    let d = debounced.get(key)
    if (!d) {
      d = debounce(() => {
        fn(key)
      }, ms)
      debounced.set(key, d)
    }
    d()
  }
}
