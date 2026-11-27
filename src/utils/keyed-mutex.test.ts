import { describe, expect, it } from 'vitest'
import { keyedMutex } from './keyed-mutex'

const tick = () => new Promise(resolve => setTimeout(resolve, 1))

describe('keyedMutex', () => {
  it('runs callers sharing a key one after another, in call order', async () => {
    const exclusive = keyedMutex()
    const log: string[] = []
    const job = (name: string) => async () => {
      log.push(`${name} start`)
      await tick()
      log.push(`${name} end`)
    }

    await Promise.all([
      exclusive('a', job('1')),
      exclusive('a', job('2')),
      exclusive('a', job('3')),
    ])

    expect(log).toEqual(['1 start', '1 end', '2 start', '2 end', '3 start', '3 end'])
  })

  it('does not block callers with different keys', async () => {
    const exclusive = keyedMutex()
    const log: string[] = []
    const job = (name: string) => async () => {
      log.push(`${name} start`)
      await tick()
      log.push(`${name} end`)
    }

    await Promise.all([exclusive('a', job('a')), exclusive('b', job('b'))])

    expect(log).toEqual(['a start', 'b start', 'a end', 'b end'])
  })

  it('keeps serializing callers that queue up after the mutex was idle', async () => {
    const exclusive = keyedMutex()
    await exclusive('a', () => Promise.resolve())
    const log: string[] = []
    const job = (name: string) => async () => {
      log.push(`${name} start`)
      await tick()
      log.push(`${name} end`)
    }

    await Promise.all([exclusive('a', job('1')), exclusive('a', job('2'))])

    expect(log).toEqual(['1 start', '1 end', '2 start', '2 end'])
  })
})
