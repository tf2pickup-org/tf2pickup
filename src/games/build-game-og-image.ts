import { createCanvas } from '@napi-rs/canvas'
import { environment } from '../environment'
import { type GameModel } from '../database/models/game.model'
import { gameStateLabel } from './game-state-label'
import { measureTime } from '../utils/measure-time'
import { ogImage } from '../og-image'

const { width, height } = ogImage.size
const redColor = '#b8383b'
const bluColor = '#5885a2'

function loadMapBackground(map: string) {
  const mapName = /^([a-z]+_[a-zA-Z0-9]+)/.exec(map)?.[0] ?? 'unknown'
  return ogImage.load(
    `${environment.THUMBNAIL_SERVICE_URL}/unsafe/${width}x${height}/${mapName}.jpg`,
  )
}

export async function buildGameOgImage(
  game: Pick<GameModel, 'number' | 'map' | 'state' | 'score'>,
): Promise<Buffer> {
  let mapBackground: 'loaded' | 'missing' = 'missing'
  return measureTime(
    async () => {
      ogImage.registerFonts()

      const canvas = createCanvas(width, height)
      const ctx = canvas.getContext('2d')

      const background = await loadMapBackground(game.map)
      mapBackground = background ? 'loaded' : 'missing'
      ogImage.drawBackground(ctx, background)

      // scrim for legibility
      const scrim = ctx.createLinearGradient(0, 0, 0, height)
      scrim.addColorStop(0, 'rgba(26, 22, 27, 0.55)')
      scrim.addColorStop(1, 'rgba(26, 22, 27, 0.9)')
      ctx.fillStyle = scrim
      ctx.fillRect(0, 0, width, height)

      await ogImage.drawLogo(ctx)

      // game number
      ctx.fillStyle = '#cdc6cf'
      ctx.font = '500 40px Satoshi'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`GAME #${game.number}`, 64, height - 180)

      // score or state, bottom-right — drawn first so the map name can be truncated to fit
      let contentLeftEdge: number
      ctx.textAlign = 'right'
      if (game.score) {
        ctx.font = '700 110px Satoshi'
        const x = width - 64
        const y = height - 84
        const sep = ' : '
        const redText = `${game.score.red}`
        const bluText = `${game.score.blu}`
        const sepWidth = ctx.measureText(sep).width
        const bluWidth = ctx.measureText(bluText).width
        const redWidth = ctx.measureText(redText).width
        ctx.fillStyle = bluColor
        ctx.fillText(bluText, x, y)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(sep, x - bluWidth, y)
        ctx.fillStyle = redColor
        ctx.fillText(redText, x - bluWidth - sepWidth, y)

        ctx.font = '500 32px Satoshi'
        ctx.fillStyle = redColor
        ctx.fillText('RED', x - bluWidth - sepWidth, y - 124)
        ctx.fillStyle = bluColor
        ctx.fillText('BLU', x, y - 124)

        contentLeftEdge = x - bluWidth - sepWidth - redWidth
      } else {
        const label = gameStateLabel(game.state)
        ctx.fillStyle = '#cdc6cf'
        ctx.font = '500 48px Satoshi'
        ctx.fillText(label, width - 64, height - 90)
        contentLeftEdge = width - 64 - ctx.measureText(label).width
      }

      // map name, truncated so it never runs under the score
      ctx.textAlign = 'left'
      ctx.fillStyle = '#ffffff'
      ctx.font = '700 96px Satoshi'
      ctx.fillText(ogImage.truncateToWidth(ctx, game.map, contentLeftEdge - 96), 64, height - 90)

      // encode off the main thread (libuv threadpool) to keep the event loop responsive
      return await canvas.encode('png')
    },
    ({ ms, result }) => {
      ogImage.metrics.renderDuration.record(ms, {
        subject: 'game',
        map_background: mapBackground,
        result,
      })
    },
  )
}
