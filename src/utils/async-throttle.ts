// Leading-edge throttle: the first call invokes `fn` and every call within the
// next `throttleMs` receives that same in-flight/settled promise. Note that
// arguments passed to calls that hit the cache are ignored — they get the result
// computed from the first call's arguments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asyncThrottle<T, Fn extends (...args: any[]) => Promise<T>>(
  fn: Fn,
  throttleMs: number,
): (...args: Parameters<Fn>) => Promise<T> {
  let ret: Promise<T> | undefined

  return (...args: Parameters<Fn>) => {
    if (ret) {
      return ret
    }

    ret = fn(...args)
    setTimeout(() => (ret = undefined), throttleMs)
    return ret
  }
}
