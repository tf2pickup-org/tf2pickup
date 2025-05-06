import { describe, expect, it } from 'vitest'
import { hideIpAddresses } from './hide-ip-addresses'

describe('hideIpAddresses', () => {
  it('should replace IPv4 addresses with 0.0.0.0', () => {
    expect(
      hideIpAddresses(
        'L 08/01/2024 - 16:08:16: "lupus<6><[U:1:58880794]><>" connected, address "192.0.2.1:27005"',
      ),
    ).toBe(
      'L 08/01/2024 - 16:08:16: "lupus<6><[U:1:58880794]><>" connected, address "0.0.0.0:27005"',
    )
  })
})
