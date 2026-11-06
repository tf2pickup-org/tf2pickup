// Scripted swarm for the AI playground: bots from the seeded roster queue up and play games (the
// simulator daemon's autoplay plays them out), the rest browse and chat, and an admin bans and
// mutes someone each round. Every action is timed, and page errors, console errors and 5xx
// responses are recorded; the events go to a JSONL file and a summary is printed at the end.
//
//   SWARM_URL=https://aiplayground.tf2pickup.org TEST_AUTH_SECRET=... pnpm tsx tests/swarm.ts
import { chromium, type Page } from '@playwright/test'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { appendFileSync } from 'node:fs'
import { sample, shuffle } from 'es-toolkit'
import { loremIpsum } from 'lorem-ipsum'
import { QueuePage } from './pages/queue.page'
import { GamePage } from './pages/game.page'
import { AdminPage } from './pages/admin.page'
import { expect } from './fixtures/expect'
import { getPlayerCount, queueSlots } from './queue-slots'

const url = process.env['SWARM_URL'] ?? 'https://aiplayground.tf2pickup.org'
const secret = process.env['TEST_AUTH_SECRET']
const rounds = Number(process.env['SWARM_ROUNDS'] ?? 1)
const out = process.env['SWARM_OUT'] ?? `swarm-${new Date().toISOString()}.jsonl`
const headless = process.env['SWARM_HEADED'] !== 'true'

if (!secret) {
  throw new Error('TEST_AUTH_SECRET is required')
}

// the roster from ai-playground/seed.js: 3 admins, then 24 players
const steamId = (n: number) => `765611999980${String(n).padStart(5, '0')}`
const admin = steamId(2)
const bench = Array.from({ length: 24 }, (_, i) => steamId(i + 4))

interface Event {
  t: string
  bot: string
  action: string
  ms?: number
  ok?: boolean
  error?: string
  kind?: 'pageerror' | 'console' | 'http'
}

const events: Event[] = []
function record(event: Omit<Event, 't'>) {
  // error messages may quote the sign-in URL
  const e = JSON.parse(
    JSON.stringify({ t: new Date().toISOString(), ...event })
      .replaceAll(secret!, 'REDACTED')
      .replaceAll(encodeURIComponent(secret!), 'REDACTED'),
  ) as Event
  events.push(e)
  appendFileSync(out, `${JSON.stringify(e)}\n`)
}

const browser = await chromium.launch({ headless })
const pages = new Map<string, Page>()

async function bot(id: string) {
  const existing = pages.get(id)
  if (existing) {
    return existing
  }

  const context = await browser.newContext({ baseURL: url })
  const page = await context.newPage()
  page.on('pageerror', error => {
    record({ bot: id, action: 'pageerror', kind: 'pageerror', error: error.message })
  })
  page.on('console', message => {
    if (message.type() === 'error') {
      record({ bot: id, action: 'console', kind: 'console', error: message.text() })
    }
  })
  page.on('response', response => {
    if (response.status() >= 500) {
      record({
        bot: id,
        action: `${response.request().method()} ${new URL(response.url()).pathname}`,
        kind: 'http',
        error: String(response.status()),
      })
    }
  })
  const response = await page.goto(`/auth/test?steamId=${id}&secret=${encodeURIComponent(secret!)}`)
  if (response?.status() === 403) {
    throw new Error('sign-in rejected: TEST_AUTH_SECRET does not match the instance')
  }
  await page.waitForURL(`${url}/`)
  pages.set(id, page)
  return page
}

// Runs one bot action; failures are recorded, never thrown, so one stuck bot doesn't end the run.
async function step(id: string, action: string, fn: (page: Page) => Promise<unknown>) {
  const start = performance.now()
  try {
    await fn(await bot(id))
    record({ bot: id, action, ms: Math.round(performance.now() - start), ok: true })
    return true
  } catch (error) {
    const message = error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error)
    record({
      bot: id,
      action,
      ms: Math.round(performance.now() - start),
      ok: false,
      error: message,
    })
    return false
  }
}

const pause = (min: number, max: number) =>
  new Promise(resolve =>
    setTimeout(resolve, secondsToMilliseconds(min + Math.random() * (max - min))),
  )

async function playGame(players: string[]) {
  const slots = Array.from(queueSlots())
  const join = (id: string, i: number) =>
    step(id, 'join queue', async page => {
      const queue = new QueuePage(page)
      await queue.goto()
      // players of the previous game are freed a while after it ends
      await expect(queue.slot(slots[i]!).joinButton()).toBeEnabled({
        timeout: minutesToMilliseconds(3),
      })
      await queue.joinQueue(slots[i]!)
    })

  // map votes close once the queue fills up, so the last player joins after the votes are in
  const last = players.length - 1
  const joined = await Promise.all(players.slice(0, last).map(join))
  if (joined.includes(false)) {
    return
  }

  await Promise.all(
    players
      .slice(0, last)
      .filter(() => Math.random() < 0.5)
      .map(id =>
        step(id, 'vote for map', page =>
          new QueuePage(page)
            .voteForMapButton(Math.floor(Math.random() * 3))
            .click({ timeout: secondsToMilliseconds(5) }),
        ),
      ),
  )

  if (!(await join(players[last]!, last))) {
    return
  }

  let gameNumber = 0
  await Promise.all(
    players.map((id, i) =>
      step(id, 'ready up', async page => {
        await new QueuePage(page).readyUp(slots[i]!)
        await page.waitForURL(/games\/\d+/, { timeout: minutesToMilliseconds(1) })
        gameNumber = Number(/games\/(\d+)/.exec(page.url())![1])
      }),
    ),
  )
  if (!gameNumber) {
    return
  }

  await Promise.all(
    players.map(id =>
      step(id, 'play game', async page => {
        const game = new GamePage(page, gameNumber)
        await expect(game.gameEvent('Game started')).toBeVisible({
          timeout: minutesToMilliseconds(3),
        })
        await expect(game.gameEvent('Game ended')).toBeVisible({
          timeout: minutesToMilliseconds(10),
        })
      }),
    ),
  )
}

const browseActions: [string, (page: Page) => Promise<unknown>][] = [
  ['browse queue', page => page.goto('/')],
  ['browse games', page => page.goto('/games')],
  ['browse players', page => page.goto('/players')],
  ['browse player', page => page.goto(`/players/${sample(bench)}`)],
  ['browse statistics', page => page.goto('/statistics')],
  ['browse hall of fame', page => page.goto('/hall-of-fame')],
  ['browse rules', page => page.goto('/rules')],
  [
    'browse game',
    async page => {
      await page.goto('/games')
      const games = page.locator('a[href^="/games/"]')
      if ((await games.count()) > 0) {
        await games.first().click()
        await page.waitForURL(/games\/\d+/)
      }
    },
  ],
  [
    'chat',
    async page => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Chat' }).click()
      const message = loremIpsum({ count: 1, units: 'sentences' })
      await page.getByPlaceholder('Send message...').fill(message)
      await page.getByRole('button', { name: 'Send message' }).click()
      await expect(page.getByText(message)).toBeVisible()
    },
  ],
]

async function browse(id: string, until: () => boolean) {
  while (!until()) {
    const [action, fn] = sample(browseActions)
    await step(id, action, fn)
    await pause(5, 15)
  }
}

async function moderate(target: string) {
  await step(admin, 'ban player', page =>
    new AdminPage(page).banPlayer(target, { reason: 'swarm' }),
  )
  await step(target, 'see ban alert', async page => {
    const queue = new QueuePage(page)
    await queue.goto()
    await expect(queue.banAlert()).toBeVisible()
  })
  await step(admin, 'revoke ban', page => new AdminPage(page).revokeAllBans(target))
  await step(admin, 'mute player', page =>
    new AdminPage(page).muteChatPlayer(target, { reason: 'swarm' }),
  )
  await step(admin, 'revoke mute', page => new AdminPage(page).revokeAllChatMutes(target))
}

try {
  // fail fast on a wrong secret instead of recording a round of failed steps
  await bot(admin)
  // sign everyone in up front, so sign-ins don't count towards the first step's timing
  await Promise.all(bench.map(bot))
  for (let round = 1; round <= rounds; ++round) {
    const [target, ...rest] = shuffle(bench)
    const players = rest.slice(0, getPlayerCount())
    const idle = rest.slice(getPlayerCount())
    console.log(`round ${round}/${rounds}`)

    let done = false
    await Promise.all([
      playGame(players).finally(() => (done = true)),
      ...idle.map(id => browse(id, () => done)),
      moderate(target!),
    ])
  }
} finally {
  await browser.close()
}

const actions = Map.groupBy(
  events.filter(e => e.ms !== undefined),
  e => e.action,
)
console.log(`\n${out}\n`)
console.table(
  Object.fromEntries(
    [...actions].map(([action, list]) => {
      const ms = list.map(e => e.ms!).sort((a, b) => a - b)
      return [
        action,
        {
          count: list.length,
          failed: list.filter(e => !e.ok).length,
          p50: ms[Math.floor(ms.length / 2)],
          p95: ms[Math.floor(ms.length * 0.95)],
        },
      ]
    }),
  ),
)
const problems = events.filter(e => e.kind !== undefined)
console.log(`${problems.length} page errors, console errors and 5xx responses`)
