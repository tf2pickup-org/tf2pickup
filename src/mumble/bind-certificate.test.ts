import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { MumbleVerificationMethod } from '../database/models/player.model'

vi.mock('../database/collections', () => ({
  collections: { players: { findOne: vi.fn() } },
}))
vi.mock('../players', () => ({ players: { update: vi.fn() } }))
vi.mock('../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('./verification-count', () => ({ verificationCount: { add: vi.fn() } }))

import { bindCertificate } from './bind-certificate'
import { collections } from '../database/collections'
import { players } from '../players'
import { events } from '../events'
import { verificationCount } from './verification-count'

const player = '76561198000000000' as SteamId64
const other = '76561198000000001' as SteamId64

describe('bindCertificate()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('binds an unused certificate', async () => {
    vi.mocked(collections.players.findOne).mockResolvedValue(null)
    await expect(bindCertificate(player, 'hash', MumbleVerificationMethod.code)).resolves.toEqual({
      outcome: 'bound',
    })
    expect(players.update).toHaveBeenCalledWith(player, {
      $set: {
        mumbleCertificate: {
          hash: 'hash',
          boundAt: expect.any(Date),
          method: MumbleVerificationMethod.code,
        },
      },
    })
    expect(verificationCount.add).toHaveBeenCalledWith(1, {
      method: MumbleVerificationMethod.code,
      outcome: 'bound',
    })
  })

  it('does nothing when the certificate is already bound to the same player', async () => {
    vi.mocked(collections.players.findOne).mockResolvedValue({ steamId: player } as never)
    await expect(bindCertificate(player, 'hash', MumbleVerificationMethod.code)).resolves.toEqual({
      outcome: 'alreadyBound',
    })
    expect(players.update).not.toHaveBeenCalled()
  })

  it('refuses a certificate bound to another player and reports the conflict', async () => {
    vi.mocked(collections.players.findOne).mockResolvedValue({ steamId: other } as never)
    await expect(bindCertificate(player, 'hash', MumbleVerificationMethod.code)).resolves.toEqual({
      outcome: 'conflict',
      owner: other,
    })
    expect(players.update).not.toHaveBeenCalled()
    expect(events.emit).toHaveBeenCalledWith('mumble/certificateConflict', {
      player,
      owner: other,
    })
  })
})
