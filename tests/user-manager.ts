import { QueuePage } from './pages/queue.page'
import { GamePage } from './pages/game.page'
import { users } from './data'
import { AdminPage } from './pages/admin.page'
import type { BrowserContext, Page } from '@playwright/test'

// https://stackoverflow.com/questions/52489261/can-i-define-an-n-length-tuple-type
type Tuple<T, N, R extends T[] = []> = R['length'] extends N ? Readonly<R> : Tuple<T, N, [...R, T]>

export type UserSteamId = (typeof users)[number]['steamId']
export type UserName = (typeof users)[number]['name']

export class UserContext {
  readonly playerName: UserName
  private _page?: Page
  private _browserContext?: BrowserContext
  private readonly _contextFactory: () => Promise<BrowserContext>

  constructor(
    public readonly steamId: UserSteamId,
    contextFactory: () => Promise<BrowserContext>,
  ) {
    const playerName = users.find(u => u.steamId === steamId)?.name
    if (!playerName) {
      throw new Error(`player name not found for steamId ${this.steamId}`)
    }

    this.playerName = playerName
    this._contextFactory = contextFactory
  }

  get browserContext(): BrowserContext {
    if (!this._browserContext) {
      throw new Error('Browser context not initialized yet - call page() first')
    }
    return this._browserContext
  }

  async page() {
    this._browserContext ??= await this._contextFactory()
    if (!this._page || this._page.isClosed()) {
      this._page = await this._browserContext.newPage()
    }
    return this._page
  }

  get isAdmin() {
    const u = users.find(u => u.steamId === this.steamId)!
    return 'roles' in u && u.roles.includes('admin')
  }

  async adminPage() {
    return new AdminPage(await this.page())
  }

  async gamePage(gameNumber: number) {
    const page = await this.page()
    const gamePage = new GamePage(page, gameNumber)
    if (!page.url().includes(`/games/${gameNumber}`)) {
      await gamePage.goto()
    }
    return gamePage
  }

  async queuePage() {
    return new QueuePage(await this.page())
  }

  async close() {
    if (this._page) {
      await this._page.close()
    }
    if (this._browserContext) {
      await this._browserContext.close()
    }
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

  bySteamId(steamId: UserSteamId): UserContext {
    const user = this.users.find(user => user.steamId === steamId)
    if (user === undefined) {
      throw new Error(`user with steamId ${steamId} not found`)
    }
    return user
  }

  byName(name: UserName): UserContext {
    const user = this.users.find(user => user.playerName === name)
    if (user === undefined) {
      throw new Error(`user with name ${name} not found`)
    }
    return user
  }

  *[Symbol.iterator]() {
    for (const user of this.users) {
      yield user
    }
  }
}
