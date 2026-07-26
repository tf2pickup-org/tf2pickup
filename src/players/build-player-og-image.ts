import { format } from 'date-fns'
import { createCanvas } from '@napi-rs/canvas'
import { environment } from '../environment'
import { PlayerRole, type PlayerModel } from '../database/models/player.model'
import { playerAvatarUrl } from '../shared/player-avatar-url'
import { measureTime } from '../utils/measure-time'
import { ogImage } from '../og-image'

const { width, height } = ogImage.size
const avatarSize = 280

export async function buildPlayerOgImage(
  player: Pick<PlayerModel, 'name' | 'joinedAt' | 'avatar' | 'roles' | 'stats'>,
): Promise<Buffer> {
  let avatarStatus: 'loaded' | 'missing' = 'missing'
  return measureTime(
    async () => {
      ogImage.registerFonts()

      const canvas = createCanvas(width, height)
      const ctx = canvas.getContext('2d')

      const background = await ogImage.load(`${environment.WEBSITE_URL}/bg.png`)
      ogImage.drawBackground(ctx, background)

      // scrim for legibility
      ctx.fillStyle = 'rgba(26, 22, 27, 0.82)'
      ctx.fillRect(0, 0, width, height)

      await ogImage.drawLogo(ctx)

      // avatar, circular, left
      const avatarX = 96
      const avatarY = (height - avatarSize) / 2 + 30
      const avatar = await ogImage.load(playerAvatarUrl(player.avatar, 'large'))
      avatarStatus = avatar ? 'loaded' : 'missing'
      if (avatar) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
        ctx.restore()
        ctx.beginPath()
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
        ctx.lineWidth = 6
        ctx.strokeStyle = '#49424d'
        ctx.stroke()
      }

      const textX = avatarX + avatarSize + 64
      const maxTextWidth = width - textX - 64

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
      return await canvas.encode('png')
    },
    ({ ms, result }) => {
      ogImage.metrics.renderDuration.record(ms, {
        subject: 'player',
        avatar: avatarStatus,
        result,
      })
    },
  )
}
