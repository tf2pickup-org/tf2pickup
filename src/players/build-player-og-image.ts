import { format } from 'date-fns'
import { createCanvas } from '@napi-rs/canvas'
import { environment } from '../environment'
import { PlayerRole, type PlayerModel } from '../database/models/player.model'
import { playerAvatarUrl } from '../shared/player-avatar-url'
import { ogImage } from '../og-image'

const { width: WIDTH, height: HEIGHT } = ogImage.size
const AVATAR_SIZE = 280

export async function buildPlayerOgImage(
  player: Pick<PlayerModel, 'name' | 'joinedAt' | 'avatar' | 'roles' | 'stats'>,
): Promise<Buffer> {
  const start = performance.now()
  ogImage.registerFonts()

  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')

  const background = await ogImage.load(`${environment.WEBSITE_URL}/bg.png`)
  ogImage.drawBackground(ctx, background)

  // scrim for legibility
  ctx.fillStyle = 'rgba(26, 22, 27, 0.82)'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  await ogImage.drawLogo(ctx)

  // avatar, circular, left
  const avatarX = 96
  const avatarY = (HEIGHT - AVATAR_SIZE) / 2 + 30
  const avatar = await ogImage.load(playerAvatarUrl(player.avatar, 'large'))
  if (avatar) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(avatar, avatarX, avatarY, AVATAR_SIZE, AVATAR_SIZE)
    ctx.restore()
    ctx.beginPath()
    ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2)
    ctx.lineWidth = 6
    ctx.strokeStyle = '#49424d'
    ctx.stroke()
  }

  const textX = avatarX + AVATAR_SIZE + 64
  const maxTextWidth = WIDTH - textX - 64

  // name, truncated so it never overflows the canvas
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 84px Satoshi'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(ogImage.truncateToWidth(ctx, player.name, maxTextWidth), textX, avatarY + 150)

  // admin badge
  if (player.roles.includes(PlayerRole.admin)) {
    ctx.font = '500 28px Satoshi'
    const label = 'ADMIN'
    const padding = 16
    const labelWidth = ctx.measureText(label).width
    ctx.fillStyle = '#b8383b'
    ctx.fillRect(textX, avatarY + 178, labelWidth + padding * 2, 44)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, textX + padding, avatarY + 208)
  }

  // stats line, shrunk to fit (a sentence reads badly when truncated)
  const stats = `${player.stats.totalGames} games played · member since ${format(player.joinedAt, 'MMMM yyyy')}`
  ctx.fillStyle = '#cdc6cf'
  ogImage.fitFont(ctx, stats, maxTextWidth, 500, 38, 28)
  ctx.fillText(stats, textX, avatarY + 270)

  // encode off the main thread (libuv threadpool) to keep the event loop responsive
  const png = await canvas.encode('png')
  ogImage.metrics.renderDuration.record(performance.now() - start, {
    subject: 'player',
    avatar: avatar ? 'loaded' : 'missing',
  })
  return png
}
