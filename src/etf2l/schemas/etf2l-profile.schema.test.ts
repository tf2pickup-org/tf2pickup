import { describe, expect, it } from 'vitest'
import { etf2lProfileSchema } from './etf2l-profile.schema'

describe('etf2lProfileSchema', () => {
  it('decodes HTML entities in ban reasons', () => {
    const profile = etf2lProfileSchema.parse({
      id: 1,
      name: 'a',
      country: 'b',
      bans: [
        { start: 1, end: 2, reason: 'Toxicity &amp; Racism &lt;&gt;&quot;&#39;&#039;&amp;lt;' },
      ],
    })
    expect(profile.bans![0]!.reason).toBe(`Toxicity & Racism <>"''&lt;`)
  })
})
