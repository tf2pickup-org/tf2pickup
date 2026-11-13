import fastify from 'fastify'
import { validatorCompiler } from 'fastify-type-provider-zod'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import skillImportExportRoutes from './index'

vi.mock('../../../database/collections', () => ({ collections: {} }))
vi.mock('../../../admin/skill-import-export/views/html/skill-import-export.page', () => ({
  SkillImportExportPage: vi.fn(),
}))
vi.mock('../../../admin/skill-import-export/views/html/preview.page', () => ({
  PreviewPage: vi.fn(),
}))
vi.mock('../../../queues', () => ({
  queues: { gamemodesInUse: vi.fn().mockResolvedValue(['6v6']) },
}))
vi.mock('../../../admin/skill-import-export/analyze-import', () => ({ analyzeImport: vi.fn() }))
vi.mock('../../../admin/skill-import-export/apply-import', () => ({ applyImport: vi.fn() }))
vi.mock('../../../admin/skill-import-export/export-skills', () => ({
  exportSkills: vi.fn().mockResolvedValue('steamId,name\n1,foo\n'),
}))

describe('GET /export', () => {
  const logs: string[] = []
  const app = fastify({ logger: { level: 'warn', stream: { write: line => logs.push(line) } } })

  beforeAll(async () => {
    app.setValidatorCompiler(validatorCompiler)
    await app.register((await import('@kitajs/fastify-html-plugin')).default)
    app.addHook('onSend', async () => {
      await new Promise(resolve => setImmediate(resolve))
    })
    await app.register(skillImportExportRoutes)
    await app.listen({ port: 0 })
  })

  afterAll(async () => {
    await app.close()
  })

  it('sends the csv once', async () => {
    const response = await fetch(`${app.listeningOrigin}/export`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(await response.text()).toBe('steamId,name\n1,foo\n')
    expect(logs).toEqual([])
  })
})
