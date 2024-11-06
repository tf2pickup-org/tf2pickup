import type { Page } from '@playwright/test'
import { QueuePage } from './pages/queue.page'
import { GamePage } from './pages/game.page'
import { users } from './data'
import { AdminPage } from './pages/admin.page'

// https://stackoverflow.com/questions/52489261/can-i-define-an-n-length-tuple-type
type Tuple<T, N, R extends T[] = []> = R['length'] extends N ? Readonly<R> : Tuple<T, N, [...R, T]>

export class UserContext {
  readonly playerName: string

  constructor(
    public readonly steamId: string,
    public readonly page: Page,
  ) {
    const playerName = users.find(u => u.steamId === steamId)?.name
    if (!playerName) {
      throw new Error(`player name not found for steamId ${this.steamId}`)
    }

    this.playerName = playerName
  }

  get isAdmin() {
    const u = users.find(u => u.steamId === this.steamId)!
    return 'roles' in u && u.roles.includes('admin')
  }

  adminPage() {
    return new AdminPage(this.page)
  }

  gamePage(gameNumber: number) {
    return new GamePage(this.page, gameNumber)
  }

  queuePage() {
    return new QueuePage(this.page)
  }
}

export class UserManager {
  private takenPlayers = new Set<string>()

  constructor(public readonly users: UserContext[]) {}

  get count() {
    return this.users.length
  }

  getFirst(): UserContext {
    if (this.users.length === 0) {
      throw new Error('no users found')
    }
    return this.users[0]!
  }

  getMany<N extends number>(n: N): Tuple<UserContext, N> {
    if (this.users.length < n) {
      throw new Error(`not enough users found, expected at least ${n}, got ${this.users.length}`)
    }
    return this.users.slice(0, n) as Tuple<UserContext, N>
  }

  getAdmin(): UserContext {
    const admin = this.users.find(user => user.isAdmin)
    if (admin === undefined) {
      throw new Error('admin user not found')
    }
    return admin
  }

  getNext(predicate: (value: UserContext) => boolean = () => true): UserContext {
    const player = this.users.filter(predicate).find(user => !this.takenPlayers.has(user.steamId))
    if (player === undefined) {
      throw new Error('no more players available')
    }
    this.takenPlayers.add(player.steamId)
    return player
  }

  bySteamId(steamId: string): UserContext {
    const user = this.users.find(user => user.steamId === steamId)
    if (user === undefined) {
      throw new Error(`user with steamId ${steamId} not found`)
    }
    return user
  }

  byName(name: string): UserContext {
    const user = this.users.find(user => user.playerName === name)
    if (user === undefined) {
      throw new Error(`user with name ${name} not found`)
    }
    return user
  }
}
