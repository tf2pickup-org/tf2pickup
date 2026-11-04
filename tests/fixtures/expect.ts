import { expect as baseExpect } from '@playwright/test'
import { secondsToMilliseconds } from 'date-fns'
import { TimeoutError, withTimeout } from 'es-toolkit'
import type { GameServerSimulator } from '../game-server-simulator'

export const expect = baseExpect.extend({
  async toHaveCommand(
    gameServer: GameServerSimulator,
    command: string | RegExp,
    options?: { timeout?: number },
  ) {
    const assertionName = 'toHaveCommand'
    let pass = false

    const hasCommand = () =>
      gameServer.commands.some(cmd => {
        if (command instanceof RegExp) {
          return command.test(cmd)
        } else {
          return cmd.includes(command)
        }
      })

    let id: ReturnType<typeof setInterval> | undefined
    try {
      await withTimeout(
        () =>
          new Promise<void>(resolve => {
            if (hasCommand()) {
              resolve()
            }

            id = setInterval(() => {
              if (hasCommand()) {
                resolve()
              }
            }, secondsToMilliseconds(0.5))
          }),
        options?.timeout ?? this.timeout,
      )
      pass = true
    } catch (error) {
      if (error instanceof TimeoutError) {
        // empty
      } else {
        throw error
      }
    } finally {
      clearInterval(id)
    }

    const message = () => {
      const header = this.utils.matcherHint(
        assertionName,
        gameServer.commands.join('\n'),
        command,
        { isNot: this.isNot },
      )
      return `${header} \n\nExpected: ${this.utils.printExpected(command)}\nReceived: ${this.utils.printReceived(gameServer.commands.join('\n'))}`
    }

    return {
      pass,
      message,
      name: assertionName,
      expected: command,
      actual: gameServer.commands.join('\n'),
    }
  },
})
