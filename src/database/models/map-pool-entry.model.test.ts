import { describe, expect, it } from 'vitest'
import { mapPoolEntrySchema } from './map-pool-entry.model'

describe('mapPoolEntrySchema', () => {
  it('should trim surrounding whitespace from the map name', () => {
    const parsed = mapPoolEntrySchema.parse({ name: '  cp_snakewater_final1 ' })
    expect(parsed.name).toBe('cp_snakewater_final1')
  })
})
