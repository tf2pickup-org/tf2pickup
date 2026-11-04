import { analyze } from './analyze'
import { createGameContext } from './create-game-context'
import type { GameContext } from './game-context'
import type { LogEvent } from './log-event'

export class Tf2GameAnalyzer {
  private readonly _context: GameContext
  private saved: string

  constructor(context?: GameContext) {
    this._context = context ?? createGameContext()
    this.saved = JSON.stringify(this._context)
  }

  parseLine(line: string): LogEvent[] {
    return analyze(this._context, line)
  }

  contextDirty(): boolean {
    return JSON.stringify(this._context) !== this.saved
  }

  markPersisted(): void {
    this.saved = JSON.stringify(this._context)
  }

  get context(): GameContext {
    return this._context
  }
}
