import { describe, expect, it } from 'vitest'
import { playerAvatarUrl } from './player-avatar-url'
import { defaultPlayerAvatar } from './default-player-avatar'

describe('playerAvatarUrl', () => {
  it("should return the player's avatar url for the requested size", () => {
    const avatar = {
      small: 'https://example.com/small.jpg',
      medium: 'https://example.com/medium.jpg',
      large: 'https://example.com/large.jpg',
    }
    expect(playerAvatarUrl(avatar, 'small')).toBe(avatar.small)
    expect(playerAvatarUrl(avatar, 'medium')).toBe(avatar.medium)
    expect(playerAvatarUrl(avatar, 'large')).toBe(avatar.large)
  })

  it('should fall back to the default avatar when the avatar is missing', () => {
    expect(playerAvatarUrl(undefined, 'large')).toBe(defaultPlayerAvatar.large)
    expect(playerAvatarUrl(undefined, 'medium')).toBe(defaultPlayerAvatar.medium)
    expect(playerAvatarUrl(undefined, 'small')).toBe(defaultPlayerAvatar.small)
  })

  it('should fall back to the default avatar when the requested size is missing', () => {
    expect(playerAvatarUrl({ medium: 'https://example.com/medium.jpg' }, 'large')).toBe(
      defaultPlayerAvatar.large,
    )
  })
})
