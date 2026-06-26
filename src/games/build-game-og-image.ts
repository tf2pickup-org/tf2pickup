import { createCanvas } from '@napi-rs/canvas'
import { environment } from '../environment'
import { type GameModel } from '../database/models/game.model'
import { gameStateLabel } from './game-state-label'
import { ogImage } from '../og-image'

const { width: WIDTH, height: HEIGHT } = ogImage.size
const RED = '#b8383b'
const BLU = '#5885a2'

function loadMapBackground(map: string) {
  const mapName = /^([a-z]+_[a-zA-Z0-9]+)/.exec(map)?.[0] ?? 'unknown'
  return ogImage.load(
    `${environment.THUMBNAIL_SERVICE_URL}/unsafe/${WIDTH}x${HEIGHT}/${mapName}.jpg`,
  )
}

export async function buildGameOgImage(
  game: Pick<GameModel, 'number' | 'map' | 'state' | 'score'>,
): Promise<Buffer> {
  const start = performance.now()
  ogImage.registerFonts()

  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')

  const background = await loadMapBackground(game.map)
  ogImage.drawBackground(ctx, background)

  // scrim for legibility
  const scrim = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  scrim.addColorStop(0, 'rgba(26, 22, 27, 0.55)')
  scrim.addColorStop(1, 'rgba(26, 22, 27, 0.9)')
  ctx.fillStyle = scrim
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  await ogImage.drawLogo(ctx)

  // game number
  ctx.fillStyle = '#cdc6cf'
  ctx.font = '500 40px Satoshi'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(`GAME #${game.number}`, 64, HEIGHT - 180)

  // score or state, bottom-right — drawn first so the map name can be truncated to fit
  let contentLeftEdge: number
  ctx.textAlign = 'right'
  if (game.score) {
    ctx.font = '700 110px Satoshi'
    const x = WIDTH - 64
    const y = HEIGHT - 84
    const sep = ' : '
    const redText = `${game.score.red}`
    const bluText = `${game.score.blu}`
    const sepWidth = ctx.measureText(sep).width
    const bluWidth = ctx.measureText(bluText).width
    const redWidth = ctx.measureText(redText).width
    ctx.fillStyle = BLU
    ctx.fillText(bluText, x, y)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(sep, x - bluWidth, y)
    ctx.fillStyle = RED
    ctx.fillText(redText, x - bluWidth - sepWidth, y)

    ctx.font = '500 32px Satoshi'
    ctx.fillStyle = RED
    ctx.fillText('RED', x - bluWidth - sepWidth, y - 124)
    ctx.fillStyle = BLU
    ctx.fillText('BLU', x, y - 124)

    contentLeftEdge = x - bluWidth - sepWidth - redWidth
  } else {
    const label = gameStateLabel(game.state)
    ctx.fillStyle = '#cdc6cf'
    ctx.font = '500 48px Satoshi'
    ctx.fillText(label, WIDTH - 64, HEIGHT - 90)
    contentLeftEdge = WIDTH - 64 - ctx.measureText(label).width
  }

  // map name, truncated so it never runs under the score
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 96px Satoshi'
  ctx.fillText(ogImage.truncateToWidth(ctx, game.map, contentLeftEdge - 96), 64, HEIGHT - 90)

  // encode off the main thread (libuv threadpool) to keep the event loop responsive
  const png = await canvas.encode('png')
  ogImage.metrics.renderDuration.record(performance.now() - start, {
    subject: 'game',
    map_background: background ? 'loaded' : 'missing',
  })
  return png
}
