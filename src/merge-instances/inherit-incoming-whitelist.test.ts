import { describe, expect, it } from 'vitest'
import { inheritIncomingWhitelist } from './inherit-incoming-whitelist'

describe('inheritIncomingWhitelist()', () => {
  it('gives the incoming global whitelist to queues without their own', () => {
    expect(
      inheritIncomingWhitelist(
        [{ whitelistId: null }, { whitelistId: 'own' }],
        'etf2l_9v9',
        'etf2l_6v6',
      ),
    ).toEqual([{ whitelistId: 'etf2l_9v9' }, { whitelistId: 'own' }])
  })

  it("changes nothing when the primary's global whitelist is the same", () => {
    expect(inheritIncomingWhitelist([{ whitelistId: null }], 'same', 'same')).toEqual([
      { whitelistId: null },
    ])
  })

  it('changes nothing when the incoming instance had no global whitelist', () => {
    expect(inheritIncomingWhitelist([{ whitelistId: null }], null, 'etf2l_6v6')).toEqual([
      { whitelistId: null },
    ])
  })
})
